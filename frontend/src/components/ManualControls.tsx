import { useEffect, useState } from "react";

import { Droplets, Utensils, Wind, Power } from "lucide-react";

interface ManualControlsProps {
  /*
   * IMPORTANT:
   * These are now controlled by the Dashboard/Firebase state.
   *
   * The Dashboard listens to:
   *   /devices/solenoid/isOn
   *   /devices/feeder/isOn
   *   /devices/aerator/isOn
   *
   * Therefore, when the ESP32 changes feeder/isOn to false,
   * this component immediately receives false and the toggle
   * changes to OFF.
   */
  refillOn?: boolean;
  feederOn?: boolean;
  aeratorOn?: boolean;

  onRefillChange?: (enabled: boolean) => void;
  onFeederChange?: (enabled: boolean) => void;
  onAeratorChange?: (enabled: boolean) => void;
}

interface ControlButtonProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  color: "blue" | "orange";
  onToggle: () => void;
}

function ControlButton({
  title,
  description,
  icon,
  enabled,
  color,
  onToggle,
}: ControlButtonProps) {
  const isBlue = color === "blue";

  return (
    <div
      className={`
        rounded-xl
        border
        p-4
        transition-all
        duration-200
        ${
          enabled
            ? isBlue
              ? "border-blue-200 bg-blue-50/60"
              : "border-orange-200 bg-orange-50/60"
            : "border-gray-100 bg-white"
        }
      `}
    >
      {/* Top */}
      <div className="flex items-center justify-between gap-3">
        {/* Icon + Text */}
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`
              flex
              h-10
              w-10
              flex-shrink-0
              items-center
              justify-center
              rounded-xl
              transition-colors
              ${
                enabled
                  ? isBlue
                    ? "bg-blue-100 text-blue-600"
                    : "bg-orange-100 text-orange-600"
                  : "bg-gray-100 text-gray-500"
              }
            `}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <p
              className="
                text-[16px]
                font-bold
                text-[#142747]
              "
            >
              {title}
            </p>

            <p
              className="
                mt-0.5
                text-[12px]
                text-[#718198]
              "
            >
              {description}
            </p>
          </div>
        </div>

        {/* ==================================================
            FIREBASE-CONTROLLED TOGGLE
        ================================================== */}

        <button
          type="button"
          onClick={onToggle}
          aria-label={`Toggle ${title}`}
          aria-pressed={enabled}
          className={`
            relative
            h-8
            w-[54px]
            flex-shrink-0
            rounded-full
            border-2
            transition-colors
            duration-200
            focus:outline-none
            ${
              enabled
                ? isBlue
                  ? "border-blue-300 bg-blue-600"
                  : "border-orange-300 bg-orange-500"
                : "border-gray-200 bg-gray-300"
            }
          `}
        >
          {/* Toggle knob */}

          <span
            className={`
              absolute
              top-1/2
              h-6
              w-6
              -translate-y-1/2
              rounded-full
              bg-white
              shadow-md
              transition-all
              duration-200
              ${enabled ? "right-1" : "left-1"}
            `}
          />
        </button>
      </div>

      {/* Bottom status */}
      <div
        className="
          mt-3
          flex
          items-center
          justify-between
        "
      >
        <span
          className="
            text-[12px]
            font-medium
            text-gray-400
          "
        >
          Manual control
        </span>

        <span
          className={`
            flex
            items-center
            gap-1.5
            text-[12px]
            font-bold
            ${
              enabled
                ? isBlue
                  ? "text-blue-600"
                  : "text-orange-600"
                : "text-gray-400"
            }
          `}
        >
          <span
            className={`
              h-2
              w-2
              rounded-full
              ${
                enabled
                  ? isBlue
                    ? "bg-blue-500"
                    : "bg-orange-500"
                  : "bg-gray-300"
              }
            `}
          />

          {enabled ? "ON" : "OFF"}
        </span>
      </div>
    </div>
  );
}

export default function ManualControls({
  refillOn,
  feederOn,
  aeratorOn,
  onRefillChange,
  onFeederChange,
  onAeratorChange,
}: ManualControlsProps) {
  /*
   * ==========================================================
   * LOCAL FALLBACK STATE
   * ==========================================================
   *
   * The Firebase values from Dashboard are the source of truth.
   *
   * The fallback state is only used if a parent does not provide
   * the corresponding controlled value.
   *
   * This keeps this component compatible with existing usage.
   */

  const [localRefill, setLocalRefill] = useState(false);

  const [localFeeder, setLocalFeeder] = useState(false);

  const [localAerator, setLocalAerator] = useState(false);

  /*
   * ==========================================================
   * EFFECTIVE DEVICE STATES
   * ==========================================================
   *
   * If Dashboard provides Firebase state, use it.
   *
   * This is the important fix:
   *
   * ESP32
   *   ↓
   * Firebase /devices/feeder/isOn = false
   *   ↓
   * Dashboard devices.feeder = false
   *   ↓
   * feederOn = false
   *   ↓
   * Toggle becomes OFF
   */

  const refill = typeof refillOn === "boolean" ? refillOn : localRefill;

  const feeder = typeof feederOn === "boolean" ? feederOn : localFeeder;

  const aerator = typeof aeratorOn === "boolean" ? aeratorOn : localAerator;

  /*
   * ==========================================================
   * KEEP FALLBACK STATE SYNCHRONIZED
   * ==========================================================
   */

  useEffect(() => {
    if (typeof refillOn === "boolean") {
      setLocalRefill(refillOn);
    }
  }, [refillOn]);

  useEffect(() => {
    if (typeof feederOn === "boolean") {
      setLocalFeeder(feederOn);
    }
  }, [feederOn]);

  useEffect(() => {
    if (typeof aeratorOn === "boolean") {
      setLocalAerator(aeratorOn);
    }
  }, [aeratorOn]);

  /*
   * ==========================================================
   * REFILL
   * ==========================================================
   */

  const handleRefill = () => {
    const newState = !refill;

    /*
     * Only update fallback state when the component is not
     * controlled by the Dashboard.
     */
    if (typeof refillOn !== "boolean") {
      setLocalRefill(newState);
    }

    onRefillChange?.(newState);
  };

  /*
   * ==========================================================
   * FEEDER
   * ==========================================================
   */

  const handleFeeder = () => {
    const newState = !feeder;

    /*
     * When Dashboard provides feederOn, the Firebase listener
     * controls the visible toggle.
     *
     * We do NOT permanently maintain another independent
     * feeder state here.
     */

    if (typeof feederOn !== "boolean") {
      setLocalFeeder(newState);
    }

    onFeederChange?.(newState);
  };

  /*
   * ==========================================================
   * AERATOR
   * ==========================================================
   */

  const handleAerator = () => {
    const newState = !aerator;

    if (typeof aeratorOn !== "boolean") {
      setLocalAerator(newState);
    }

    onAeratorChange?.(newState);
  };

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-2xl
        border
        border-blue-100
        bg-white
        p-5
        shadow-sm
      "
    >
      {/* Decorative orange glow */}

      <div
        className="
          pointer-events-none
          absolute
          -right-10
          -top-10
          h-28
          w-28
          rounded-full
          bg-orange-400
          opacity-[0.07]
          blur-3xl
        "
      />

      {/* Decorative blue glow */}

      <div
        className="
          pointer-events-none
          absolute
          -bottom-10
          -left-10
          h-24
          w-24
          rounded-full
          bg-blue-500
          opacity-[0.05]
          blur-3xl
        "
      />

      {/* ==================================================
          HEADER
      ================================================== */}

      <div
        className="
          relative
          z-10
          mb-5
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div className="flex items-center gap-3">
          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              bg-blue-50
              text-blue-600
            "
          >
            <Power size={19} />
          </div>

          <div>
            <h3
              className="
                text-[18px]
                font-bold
                text-[#142747]
              "
            >
              Manual Controls
            </h3>

            <p
              className="
                text-[12px]
                text-[#718198]
              "
            >
              Control farm equipment
            </p>
          </div>
        </div>

        {/* Manual badge */}

        <span
          className="
            rounded-lg
            border
            border-orange-100
            bg-orange-50
            px-2.5
            py-1
            text-[11px]
            font-bold
            tracking-wide
            text-orange-600
          "
        >
          MANUAL
        </span>
      </div>

      {/* ==================================================
          CONTROLS
      ================================================== */}

      <div className="relative z-10 space-y-3">
        {/* Refill Tank */}

        <ControlButton
          title="Refill Tank"
          description="Solenoid valve"
          icon={<Droplets size={20} />}
          enabled={refill}
          color="blue"
          onToggle={handleRefill}
        />

        {/* Feeder */}

        <ControlButton
          title="Feeder"
          description="Feed dispensing system"
          icon={<Utensils size={20} />}
          enabled={feeder}
          color="orange"
          onToggle={handleFeeder}
        />

        {/* Aerator */}

        <ControlButton
          title="Aerator"
          description="Oxygen circulation"
          icon={<Wind size={20} />}
          enabled={aerator}
          color="blue"
          onToggle={handleAerator}
        />
      </div>

      {/* ==================================================
          WARNING
      ================================================== */}

      <div
        className="
          relative
          z-10
          mt-4
          rounded-xl
          border
          border-orange-100
          bg-orange-50/60
          px-3
          py-2.5
        "
      >
        <p
          className="
            text-[11px]
            leading-4
            text-orange-700
          "
        >
          Manual controls override automatic operation. Use only when necessary.
        </p>
      </div>
    </div>
  );
}
