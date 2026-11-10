import Input from "./Input";

export default function DateInput({value = "", onChange, resetKey, ...props}) {
  return (
    <Input {...props} key={resetKey} type="date" value={value} onChange={onChange}/>
  );
}