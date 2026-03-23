interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const InputField = ({ label, id, ...props }: InputProps) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
      {label}
    </label>
    <input
      {...props}
      id={id}
      className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 sm:text-sm transition-all"
    />
  </div>
);