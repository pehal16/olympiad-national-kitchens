"""Isolated safety checks; never connect to or signal a real process."""
import importlib.util
from pathlib import Path
import signal
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    'relay_watchdog', Path(__file__).parent.parent / 'ops/windows-hosting/relay-watchdog.py')
watchdog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(watchdog)


class WatchdogSafety(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.owner = {'pid': 123, 'start': 100, 'age': 120}
        for name, value in [('STATE', Path(self.directory.name) / 'state.json'),
                            ('listener', lambda: 123),
                            ('identity', lambda pid: self.owner.copy()),
                            ('healthy', lambda: False)]:
            item = patch.object(watchdog, name, value)
            item.start()
            self.addCleanup(item.stop)
        self.kill = patch.object(watchdog.os, 'kill').start()
        self.addCleanup(patch.stopall)

    def test_requires_three_failures_and_resets_on_success(self):
        for _ in range(2):
            self.assertEqual(watchdog.cycle(), 'probe_failed')
        self.kill.assert_not_called()
        with patch.object(watchdog, 'healthy', return_value=True):
            self.assertEqual(watchdog.cycle(), 'healthy')
        for _ in range(2):
            self.assertEqual(watchdog.cycle(), 'probe_failed')
        self.kill.assert_not_called()
        self.assertEqual(watchdog.cycle(), 'relay_released')
        self.kill.assert_called_once_with(123, signal.SIGTERM)

    def test_never_signals_unknown_owner_or_young_connection(self):
        with patch.object(watchdog, 'identity', return_value=None):
            for _ in range(4):
                self.assertEqual(watchdog.cycle(), 'no_verified_relay')
        self.owner['age'] = 10
        for _ in range(4):
            self.assertEqual(watchdog.cycle(), 'probe_failed')
        self.kill.assert_not_called()

    def test_pid_reuse_cannot_release_another_process(self):
        watchdog.cycle()
        watchdog.cycle()
        changed = {**self.owner, 'start': 999}
        with patch.object(watchdog, 'identity', side_effect=[self.owner, changed]):
            self.assertEqual(watchdog.cycle(), 'owner_changed')
        self.kill.assert_not_called()

    def test_port_change_cannot_release_another_process(self):
        watchdog.cycle()
        watchdog.cycle()
        with patch.object(watchdog, 'listener', side_effect=[123, 456]):
            self.assertEqual(watchdog.cycle(), 'owner_changed')
        self.kill.assert_not_called()

    def test_last_moment_recovery_preserves_connection(self):
        watchdog.cycle()
        watchdog.cycle()
        with patch.object(watchdog, 'healthy', side_effect=[False, True]):
            self.assertEqual(watchdog.cycle(), 'healthy')
        self.kill.assert_not_called()

    def test_new_connection_does_not_inherit_old_failures(self):
        watchdog.cycle()
        watchdog.cycle()
        self.owner['start'] = 200
        self.assertEqual(watchdog.cycle(), 'probe_failed')
        self.kill.assert_not_called()

    def test_listener_requires_exact_loopback_and_one_pid(self):
        original = spec.loader.get_code('relay_watchdog')
        fresh = importlib.util.module_from_spec(spec)
        exec(original, fresh.__dict__)
        class Result:
            stdout = ''
        result = Result()
        with patch.object(fresh.subprocess, 'run', return_value=result):
            for address in ['0.0.0.0:13100', '[::]:13100', '127.0.0.1:13101']:
                result.stdout = f'LISTEN 0 128 {address} 0.0.0.0:* users:(("sshd",pid=123,fd=7))'
                self.assertIsNone(fresh.listener())
            result.stdout = 'LISTEN 0 128 127.0.0.1:13100 0.0.0.0:* users:(("sshd",pid=123,fd=7))'
            self.assertEqual(fresh.listener(), 123)
            result.stdout += ',("sshd",pid=456,fd=7)'
            self.assertIsNone(fresh.listener())


if __name__ == '__main__':
    unittest.main()
