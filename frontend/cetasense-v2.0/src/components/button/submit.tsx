import React, { useReducer } from "react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  property1?: "variant-2" | "default";
}

export const Submit: React.FC<Props> = ({
  property1 = "default",
  disabled,
  className = "",
  children = "Submit",
  onMouseEnter,
  onMouseLeave,
  ...buttonProps
}) => {
  const [state, dispatch] = useReducer(reducer, {
    property1,
  });

  // merge antara mouse events TS dan dispatch reducer
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    dispatch("mouse_enter");
    onMouseEnter?.(e);
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    dispatch("mouse_leave");
    onMouseLeave?.(e);
  };

  // styling dasar
  const bgClass =
    state.property1 === "variant-2" ? "bg-[#303030]" : "bg-[#1c1c1c]";
  const opacityClass = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

  return (
    <button
      {...buttonProps}
      type={buttonProps.type}
      disabled={disabled}
      className={`w-[115px] h-[30px] rounded-[8.93px] relative ${bgClass} ${opacityClass} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className={`[font-family:'Inter-Bold',Helvetica] text-[#fefefe] font-bold leading-[normal] absolute ${
          state.property1 === "variant-2" ? "left-[25px] tracking-[-0.39px] text-[19.7px] top-0.5 h-6"
          : "left-[29px] tracking-[-0.35px] text-[17.3px] top-1 h-[21px]"
        }`}
      >
        {children}
      </span>
    </button>
  );
};

function reducer(state: { property1: string }, action: string) {
  switch (action) {
    case "mouse_enter":
      return { ...state, property1: "variant-2" };
    case "mouse_leave":
      return { ...state, property1: "default" };
    default:
      return state;
  }
}

export default Submit;
