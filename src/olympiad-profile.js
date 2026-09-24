const NAME_PART = /^[\p{L}]{2,}(?:[-'’][\p{L}]{2,})?$/u;

function validateOlympiadName(value) {
  const fullName = String(value || "").normalize("NFC").trim().replace(/\s+/g, " ");
  const parts = fullName.split(" ");
  if (parts.length < 2 || parts.length > 4 || !parts.every((part) => NAME_PART.test(part))) {
    return {
      valid: false,
      message: "Укажите настоящие фамилию и имя словами, без цифр, никнейма и символов. Отчество добавьте при наличии."
    };
  }
  return { valid: true, fullName };
}

module.exports = { validateOlympiadName };
