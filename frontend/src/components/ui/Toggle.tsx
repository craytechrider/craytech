interface ToggleProps {
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function Toggle({ isOn, onToggle, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={isOn}
      className={`
        relative
        inline-flex
        h-6
        w-11
        flex-shrink-0
        items-center
        rounded-full
        transition-colors
        duration-200
        ease-in-out
        focus:outline-none
        focus:ring-2
        focus:ring-emerald-500
        focus:ring-offset-2
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${isOn ? "bg-emerald-500" : "bg-slate-300"}
      `}
    >
      <span
        className={`
          inline-block
          h-5
          w-5
          transform
          rounded-full
          bg-white
          shadow-md
          transition-transform
          duration-200
          ease-in-out
          ${isOn ? "translate-x-5" : "translate-x-0.5"}
        `}
      />
    </button>
  );
}

export default Toggle;
