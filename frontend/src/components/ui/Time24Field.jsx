import Field from "./Field";
import Select from "./Select";

const HOURS = Array.from(
  { length: 24 },
  (_, index) => String(index).padStart(2, "0")
);

const MINUTES = Array.from(
  { length: 60 },
  (_, index) => String(index).padStart(2, "0")
);

export default function Time24Field({
  label,
  name,
  value = "",
  onChange,
  error,
  disabled = false,
}) {
  const [hour = "", minute = ""] = value.split(":");

  function update(nextHour, nextMinute) {
    const nextValue =
      nextHour === "" && nextMinute === ""
        ? ""
        : `${nextHour}:${nextMinute}`;

    onChange({
      target: { name, value: nextValue },
    });
  }

  return (
    <fieldset
      disabled={disabled}
      style={{
        border: 0,
        padding: 0,
        margin: 0,
        minWidth: 0,
      }}
    >
      <legend className="ui-field-label">
        {label} · 24 horas
      </legend>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "var(--space-3)",
        }}
      >
        <Field label="Hora" required error={error}>
          <Select
            name={`${name}_hora`}
            value={hour}
            onChange={(event) =>
              update(event.target.value, minute)
            }
          >
            <option value="">HH</option>
            {HOURS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Minutos" required>
          <Select
            name={`${name}_minutos`}
            value={minute}
            onChange={(event) =>
              update(hour, event.target.value)
            }
          >
            <option value="">mm</option>
            {MINUTES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </fieldset>
  );
}