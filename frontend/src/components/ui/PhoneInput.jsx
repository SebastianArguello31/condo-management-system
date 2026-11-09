import { useEffect, useId, useRef, useState } from "react";
import {
  getCountryCallingCode,
} from "libphonenumber-js/max";
import {
  isValidPhone,
  parsePhone,
} from "../../utils/phone";
import "./ui.css";

const COUNTRY_NAMES = new Intl.DisplayNames(
  ["es"],
  { type: "region" }
);

const COUNTRY_CODES = [
  "PY",
  "AR",
  "BR",
  "BO",
  "UY",
  "CL",
  "PE",
];

const COUNTRIES = COUNTRY_CODES.map((code) => ({
  code,
  name: COUNTRY_NAMES.of(code) || code,
  callingCode: getCountryCallingCode(code),
}));

function displayValue(value) {
  const phone = parsePhone(value);

  if (phone?.isValid()) {
    return phone.formatInternational();
  }

  return value || "";
}

export default function PhoneInput({
  id,
  name = "telefono",
  value = "",
  onChange,
  onBlur,
  disabled = false,
  readOnly = false,
  required = false,
  className = "",
  autoComplete = "tel",
  maxLength = 40,
  "aria-describedby": describedBy,
  "aria-invalid": externalInvalid,
  ...props
}) {
  const localId = useId();
  const inputId = id || localId;
  const errorId = `${localId}-error`;
  const helpId = `${localId}-help`;

  const [country, setCountry] = useState(
    () => parsePhone(value)?.country || "PY"
  );
  const [draft, setDraft] = useState(
    () => displayValue(value)
  );
  const [touched, setTouched] = useState(false);

  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;

    lastEmitted.current = value;

    const phone = parsePhone(value);

    setCountry(phone?.country || "PY");
    setDraft(displayValue(value));
    setTouched(false);
  }, [value]);

  function emit(nextValue) {
    lastEmitted.current = nextValue;

    onChange?.({
      target: {
        name,
        value: nextValue,
      },
      currentTarget: {
        name,
        value: nextValue,
      },
    });
  }

  function changeNumber(event) {
    const text = event.target.value;

    setDraft(text);

    const phone = parsePhone(text, country);

    if (phone?.country && text.trim().startsWith("+")) {
      setCountry(phone.country);
    }

    emit(
      phone?.isValid() && !phone.ext
        ? phone.number
        : text
    );
  }

  function changeCountry(event) {
    const nextCountry = event.target.value;
    const previousPhone = parsePhone(draft, country);

    // Al cambiar de país se conserva la parte nacional del número.
    const national = previousPhone?.nationalNumber ||
      draft.replace(/[^\d]/g, "");

    const nextDraft = national
      ? `+${getCountryCallingCode(nextCountry)} ${national}`
      : "";

    const nextPhone = parsePhone(nextDraft, nextCountry);

    setCountry(nextCountry);
    setDraft(
      nextPhone?.isValid()
        ? nextPhone.formatInternational()
        : nextDraft
    );
    setTouched(false);

    emit(
      nextPhone?.isValid() && !nextPhone.ext
        ? nextPhone.number
        : nextDraft
    );
  }

  function handleBlur(event) {
    setTouched(true);

    const phone = parsePhone(draft, country);

    if (phone?.isValid() && !phone.ext) {
      setDraft(phone.formatInternational());
      emit(phone.number);
    }

    onBlur?.(event);
  }

  const invalid =
    touched &&
    Boolean(draft.trim()) &&
    !isValidPhone(draft, country);

  const hasError = Boolean(externalInvalid) || invalid;

  const descriptionIds = [
    describedBy,
    helpId,
    invalid ? errorId : null,
  ].filter(Boolean).join(" ");

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "start",
          gap: "var(--space-2)",
        }}
      >
        <select
          className="ui-control"
          aria-label="País del teléfono"
          value={country}
          disabled={disabled || readOnly}
          onChange={changeCountry}
          style={{
            flex: "1 1 170px",
            minWidth: 0,
          }}
        >
          {COUNTRIES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name} (+{item.callingCode})
            </option>
          ))}
        </select>

        <input
          {...props}
          id={inputId}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          value={draft}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          placeholder={`+${getCountryCallingCode(country)} …`}
          onChange={changeNumber}
          onBlur={handleBlur}
          aria-invalid={hasError || undefined}
          aria-describedby={descriptionIds}
          className={[
            "ui-control",
            hasError ? "ui-control-invalid" : "",
            className,
          ].filter(Boolean).join(" ")}
          style={{
            flex: "2 1 220px",
            minWidth: 0,
          }}
        />
      </div>

      <p id={helpId} className="ui-field-help">
        Puedes ingresar el número nacional o pegarlo con su prefijo internacional.
      </p>

      {invalid && (
        <p
          id={errorId}
          className="ui-field-error"
          role="status"
        >
          Ingresa un teléfono válido para el país seleccionado.
        </p>
      )}
    </div>
  );
}