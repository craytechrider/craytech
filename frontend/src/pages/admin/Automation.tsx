import { useEffect, useState } from "react";

import {
  Activity,
  Clock,
  Loader2,
  Plus,
  Save,
  Settings,
  Trash2,
  X,
  Zap,
  CalendarDays,
  SlidersHorizontal,
} from "lucide-react";

import { onValue, push, ref, remove, set, update } from "firebase/database";

import { db } from "../../firebase";

import { Toggle } from "../../components/ui/Toggle";
import { Modal } from "../../components/ui/Modal";

interface AutomationRule {
  id: string;
  name: string;
  sensor: string;
  condition: string;
  value: number;
  action: string;
  active: boolean;
  createdAt?: number;
}

interface FeedingSchedule {
  id: string;
  name: string;
  time: string;
  frequency: string;
  active: boolean;
  createdAt?: number;
}

export default function Control() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"automation" | "schedule">(
    "automation",
  );

  const [automations, setAutomations] = useState<AutomationRule[]>([]);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  const [savingRule, setSavingRule] = useState(false);

  const [ruleName, setRuleName] = useState("");

  const [ruleSensor, setRuleSensor] = useState("Water Level");

  const [ruleCondition, setRuleCondition] = useState("Less than");

  const [ruleValue, setRuleValue] = useState("");

  const [ruleAction, setRuleAction] = useState("Turn On Refill Valve");

  const [schedules, setSchedules] = useState<FeedingSchedule[]>([]);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const [savingSchedule, setSavingSchedule] = useState(false);

  const [scheduleName, setScheduleName] = useState("Feeding Schedule");

  const [scheduleTime, setScheduleTime] = useState("08:00");

  const [scheduleFrequency, setScheduleFrequency] = useState("Daily");

  // ============================================================
  // LOAD FIREBASE
  // ============================================================

  useEffect(() => {
    const automationsRef = ref(db, "automations");

    const schedulesRef = ref(db, "schedules");

    const unsubscribeAutomations = onValue(
      automationsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setAutomations([]);
          return;
        }

        const rules: AutomationRule[] = Object.entries(data).map(
          ([id, value]: [string, any]) => ({
            id,
            name: value.name || "Automation Rule",
            sensor: value.sensor || "Water Level",
            condition: value.condition || "Less than",
            value:
              typeof value.value === "number"
                ? value.value
                : Number(value.value) || 0,
            action: value.action || "Turn On Refill Valve",
            active: value.active !== false,
            createdAt: Number(value.createdAt) || 0,
          }),
        );

        setAutomations(rules);
      },
      (error) => {
        console.error("Firebase automation error:", error);
      },
    );

    const unsubscribeSchedules = onValue(
      schedulesRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setSchedules([]);
          setLoading(false);
          return;
        }

        const scheduleList: FeedingSchedule[] = Object.entries(data).map(
          ([id, value]: [string, any]) => ({
            id,
            name: value.name || "Feeding Schedule",
            time: value.time || "08:00",
            frequency: value.frequency || "Daily",
            active: value.active !== false,
            createdAt: Number(value.createdAt) || 0,
          }),
        );

        setSchedules(scheduleList);
        setLoading(false);
      },
      (error) => {
        console.error("Firebase schedules error:", error);

        setLoading(false);
      },
    );

    return () => {
      unsubscribeAutomations();
      unsubscribeSchedules();
    };
  }, []);

  // ============================================================
  // CREATE AUTOMATION
  // ============================================================

  const handleCreateRule = async () => {
    if (!ruleName.trim()) {
      return;
    }

    if (!ruleValue) {
      return;
    }

    setSavingRule(true);

    try {
      const automationsRef = ref(db, "automations");

      const newRuleRef = push(automationsRef);

      await set(newRuleRef, {
        name: ruleName.trim(),
        sensor: ruleSensor,
        condition: ruleCondition,
        value: Number(ruleValue),
        action: ruleAction,
        active: true,
        createdAt: Date.now(),
      });

      setRuleName("");
      setRuleSensor("Water Level");
      setRuleCondition("Less than");
      setRuleValue("");
      setRuleAction("Turn On Refill Valve");

      setIsRuleModalOpen(false);
    } catch (error) {
      console.error("Failed to create automation:", error);
    } finally {
      setSavingRule(false);
    }
  };

  // ============================================================
  // TOGGLE AUTOMATION
  // ============================================================

  const handleToggleRule = async (rule: AutomationRule) => {
    try {
      await update(ref(db, `automations/${rule.id}`), {
        active: !rule.active,
      });
    } catch (error) {
      console.error("Failed to toggle automation:", error);
    }
  };

  // ============================================================
  // DELETE AUTOMATION
  // ============================================================

  const handleDeleteRule = async (id: string) => {
    try {
      await remove(ref(db, `automations/${id}`));
    } catch (error) {
      console.error("Failed to delete automation:", error);
    }
  };

  // ============================================================
  // CREATE FEEDING SCHEDULE
  // ============================================================

  const handleCreateSchedule = async () => {
    if (!scheduleTime) {
      return;
    }

    setSavingSchedule(true);

    try {
      const schedulesRef = ref(db, "schedules");

      const newScheduleRef = push(schedulesRef);

      await set(newScheduleRef, {
        name: scheduleName.trim() || "Feeding Schedule",
        time: scheduleTime,
        frequency: scheduleFrequency,
        active: true,
        createdAt: Date.now(),
      });

      setScheduleName("Feeding Schedule");

      setScheduleTime("08:00");
      setScheduleFrequency("Daily");

      setIsScheduleModalOpen(false);
    } catch (error) {
      console.error("Failed to create schedule:", error);
    } finally {
      setSavingSchedule(false);
    }
  };

  // ============================================================
  // TOGGLE SCHEDULE
  // ============================================================

  const handleToggleSchedule = async (schedule: FeedingSchedule) => {
    try {
      await update(ref(db, `schedules/${schedule.id}`), {
        active: !schedule.active,
      });
    } catch (error) {
      console.error("Failed to toggle schedule:", error);
    }
  };

  // ============================================================
  // DELETE SCHEDULE
  // ============================================================

  const handleDeleteSchedule = async (id: string) => {
    try {
      await remove(ref(db, `schedules/${id}`));
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    }
  };

  // ============================================================
  // CHANGE SCHEDULE TIME
  // ============================================================

  const handleTimeChange = async (schedule: FeedingSchedule, time: string) => {
    if (!time) {
      return;
    }

    try {
      await update(ref(db, `schedules/${schedule.id}`), {
        time,
      });
    } catch (error) {
      console.error("Failed to update schedule:", error);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div
        className="
          flex
          min-h-[60vh]
          items-center
          justify-center
          px-4
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
            text-slate-500
          "
        >
          <Loader2 size={22} className="animate-spin text-[#1749D1]" />

          <p className="text-sm font-medium">Loading automation settings...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      className="
        w-full
        min-w-0
        px-3
        pb-10
        pt-4
        sm:px-5
        sm:pt-6
        lg:px-8
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-[1500px]
        "
      >
        {/* ======================================================
            HERO
        ====================================================== */}

        <section
          className="
            relative
            mb-5
            overflow-hidden
            rounded-2xl
            bg-gradient-to-br
            from-[#1749D1]
            via-[#1557C0]
            to-[#102D79]
            px-5
            py-6
            text-white
            shadow-lg
            sm:mb-6
            sm:px-7
            sm:py-7
            lg:px-9
            lg:py-8
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-16
              -top-20
              h-52
              w-52
              rounded-full
              bg-white/10
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-24
              right-20
              h-48
              w-48
              rounded-full
              bg-orange-400/10
            "
          />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div
                className="
                  mb-3
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white/20
                  bg-white/10
                  px-3
                  py-1.5
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.18em]
                  text-blue-100
                  sm:text-xs
                "
              >
                <Zap size={13} />
                FARM AUTOMATION
              </div>

              <h1
                className="
                  text-2xl
                  font-extrabold
                  tracking-tight
                  sm:text-3xl
                  lg:text-4xl
                "
              >
                Automation
                <span className="text-orange-400">.</span>
              </h1>

              <p
                className="
                  mt-2
                  max-w-3xl
                  text-sm
                  leading-6
                  text-blue-100
                  sm:text-base
                "
              >
                Manage automatic system rules and feeding schedules for your
                CRAYTECH farm equipment.
              </p>
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-2
                sm:gap-3
              "
            >
              <HeroStat
                value={String(automations.length)}
                label="Automation Rules"
                icon={<Settings size={16} />}
              />

              <HeroStat
                value={String(schedules.length)}
                label="Feeding Schedules"
                icon={<Clock size={16} />}
              />
            </div>
          </div>
        </section>

        {/* ======================================================
            MAIN CARDS
        ====================================================== */}

        {/* TAB SWITCHER */}
        <div className="mt-7 mb-5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("automation")}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:text-sm ${
                activeTab === "automation"
                  ? "bg-gradient-to-r from-[#1749D1] to-[#102D79] text-white shadow-sm"
                  : "text-slate-500 hover:bg-blue-50 hover:text-[#1749D1]"
              }`}
            >
              <Settings size={16} />
              Automation Rules
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  activeTab === "automation"
                    ? "bg-white/20 text-white"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {automations.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("schedule")}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:text-sm ${
                activeTab === "schedule"
                  ? "bg-gradient-to-r from-[#1749D1] to-[#102D79] text-white shadow-sm"
                  : "text-slate-500 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              <Clock size={16} />
              Feeding Schedule
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  activeTab === "schedule"
                    ? "bg-white/20 text-white"
                    : "bg-orange-50 text-orange-600"
                }`}
              >
                {schedules.length}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5">
          {activeTab === "automation" && (
            <section
              className="
              relative
              min-w-0
              overflow-hidden
              rounded-2xl
              border
              border-blue-100
              bg-white
              shadow-sm
              transition
              hover:shadow-md
            "
            >
              <div
                className="
                pointer-events-none
                absolute
                -right-16
                -top-16
                h-40
                w-40
                rounded-full
                bg-blue-500/5
              "
              />

              <div
                className="
                relative
                z-10
                p-4
                sm:p-6
              "
              >
                {/* HEADER */}

                <div
                  className="
                  mb-5
                  flex
                  items-start
                  justify-between
                  gap-3
                  sm:mb-6
                "
                >
                  <div
                    className="
                    flex
                    min-w-0
                    items-center
                    gap-3
                    sm:gap-4
                  "
                  >
                    <div
                      className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-blue-50
                      text-[#1749D1]
                      sm:h-12
                      sm:w-12
                    "
                    >
                      <Settings size={22} />
                    </div>

                    <div className="min-w-0">
                      <h2
                        className="
                        truncate
                        text-lg
                        font-extrabold
                        text-slate-800
                        sm:text-xl
                      "
                      >
                        Automation Rules
                      </h2>

                      <p
                        className="
                        mt-0.5
                        text-xs
                        text-slate-400
                        sm:text-sm
                      "
                      >
                        Create conditions for your system
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRuleModalOpen(true)}
                    className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-blue-50
                    text-[#1749D1]
                    transition
                    hover:bg-blue-100
                    active:scale-95
                    sm:h-11
                    sm:w-11
                  "
                    title="Add automation"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {/* RULES */}

                <div className="space-y-3">
                  {automations.length === 0 ? (
                    <EmptyState type="automation" />
                  ) : (
                    automations.map((rule) => (
                      <div
                        key={rule.id}
                        className="
                          group
                          rounded-2xl
                          border
                          border-slate-100
                          bg-slate-50/70
                          p-4
                          transition
                          hover:bg-white
                          hover:shadow-md
                          sm:p-5
                        "
                      >
                        <div
                          className="
                            flex
                            flex-col
                            gap-4
                          "
                        >
                          <div
                            className="
                              flex
                              items-start
                              justify-between
                              gap-3
                            "
                          >
                            <div className="min-w-0">
                              <div
                                className="
                                  flex
                                  min-w-0
                                  items-center
                                  gap-2
                                "
                              >
                                <span
                                  className={`
                                    h-2.5
                                    w-2.5
                                    shrink-0
                                    rounded-full
                                    ${
                                      rule.active
                                        ? "bg-[#1749D1] shadow-[0_0_0_4px_rgba(23,73,209,0.10)]"
                                        : "bg-slate-300"
                                    }
                                  `}
                                />

                                <p
                                  className="
                                    truncate
                                    text-sm
                                    font-bold
                                    text-slate-800
                                    sm:text-base
                                  "
                                >
                                  {rule.name}
                                </p>
                              </div>
                            </div>

                            <div
                              className="
                                flex
                                shrink-0
                                items-center
                                gap-1
                              "
                            >
                              <Toggle
                                isOn={rule.active}
                                onToggle={() => handleToggleRule(rule)}
                              />

                              <button
                                type="button"
                                onClick={() => handleDeleteRule(rule.id)}
                                className="
                                  flex
                                  h-9
                                  w-9
                                  items-center
                                  justify-center
                                  rounded-lg
                                  text-slate-300
                                  transition
                                  hover:bg-red-50
                                  hover:text-red-500
                                  sm:opacity-0
                                  sm:group-hover:opacity-100
                                "
                                title="Delete rule"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div
                            className="
                              flex
                              flex-wrap
                              items-center
                              gap-1.5
                              sm:gap-2
                            "
                          >
                            <RuleBadge variant="blue">{rule.sensor}</RuleBadge>

                            <span
                              className="
                                text-[10px]
                                font-bold
                                text-slate-400
                                sm:text-xs
                              "
                            >
                              {rule.condition}
                            </span>

                            <RuleBadge variant="slate">{rule.value}</RuleBadge>

                            <span className="px-0.5 text-slate-300">→</span>

                            <RuleBadge variant="orange">
                              {rule.action}
                            </RuleBadge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  <button
                    type="button"
                    onClick={() => setIsRuleModalOpen(true)}
                    className="
                    flex
                    min-h-[46px]
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border-2
                    border-dashed
                    border-blue-200
                    px-4
                    py-2.5
                    text-sm
                    font-bold
                    text-slate-400
                    transition
                    hover:border-blue-300
                    hover:bg-blue-50/50
                    hover:text-[#1749D1]
                  "
                  >
                    <Plus size={18} />
                    Add New Rule
                  </button>
                </div>
              </div>
            </section>
          )}
          {activeTab === "schedule" && (
            <section
              className="
              relative
              min-w-0
              overflow-hidden
              rounded-2xl
              border
              border-orange-100
              bg-white
              shadow-sm
              transition
              hover:shadow-md
            "
            >
              <div
                className="
                pointer-events-none
                absolute
                -right-16
                -top-16
                h-40
                w-40
                rounded-full
                bg-orange-500/5
              "
              />

              <div
                className="
                relative
                z-10
                p-4
                sm:p-6
              "
              >
                {/* HEADER */}

                <div
                  className="
                  mb-5
                  flex
                  items-start
                  justify-between
                  gap-3
                  sm:mb-6
                "
                >
                  <div
                    className="
                    flex
                    min-w-0
                    items-center
                    gap-3
                    sm:gap-4
                  "
                  >
                    <div
                      className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-orange-50
                      text-orange-500
                      sm:h-12
                      sm:w-12
                    "
                    >
                      <Clock size={22} />
                    </div>

                    <div className="min-w-0">
                      <h2
                        className="
                        truncate
                        text-lg
                        font-extrabold
                        text-slate-800
                        sm:text-xl
                      "
                      >
                        Feeding Schedule
                      </h2>

                      <p
                        className="
                        mt-0.5
                        text-xs
                        text-slate-400
                        sm:text-sm
                      "
                      >
                        Automatic feeding times
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-orange-50
                    text-orange-500
                    transition
                    hover:bg-orange-100
                    active:scale-95
                    sm:h-11
                    sm:w-11
                  "
                    title="Add feeding schedule"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {/* SCHEDULES */}

                {schedules.length === 0 ? (
                  <EmptyState type="schedule" />
                ) : (
                  <div className="space-y-3">
                    {schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="
                          group
                          rounded-2xl
                          border
                          border-slate-100
                          bg-slate-50/70
                          p-4
                          transition
                          hover:bg-white
                          hover:shadow-md
                          sm:p-5
                        "
                      >
                        <div
                          className="
                            flex
                            items-start
                            justify-between
                            gap-3
                          "
                        >
                          <div
                            className="
                              flex
                              min-w-0
                              items-center
                              gap-3
                            "
                          >
                            <div
                              className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-orange-50
                                text-orange-500
                              "
                            >
                              <Clock size={18} />
                            </div>

                            <div className="min-w-0">
                              <p
                                className="
                                  truncate
                                  text-sm
                                  font-bold
                                  text-slate-800
                                  sm:text-base
                                "
                              >
                                {schedule.name}
                              </p>

                              <p
                                className="
                                  mt-0.5
                                  text-xs
                                  text-slate-400
                                "
                              >
                                {schedule.frequency}
                              </p>
                            </div>
                          </div>

                          <div
                            className="
                              flex
                              shrink-0
                              items-center
                              gap-1
                            "
                          >
                            <Toggle
                              isOn={schedule.active}
                              onToggle={() => handleToggleSchedule(schedule)}
                            />

                            <button
                              type="button"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="
                                flex
                                h-9
                                w-9
                                items-center
                                justify-center
                                rounded-lg
                                text-slate-300
                                transition
                                hover:bg-red-50
                                hover:text-red-500
                                sm:opacity-0
                                sm:group-hover:opacity-100
                              "
                              title="Delete schedule"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* TIME */}

                        <div
                          className="
                            mt-4
                            flex
                            flex-col
                            gap-3
                            rounded-xl
                            border
                            border-slate-100
                            bg-white
                            p-3
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                          "
                        >
                          <div
                            className="
                              flex
                              min-w-0
                              items-center
                              gap-3
                            "
                          >
                            <div
                              className="
                                flex
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                bg-orange-50
                                text-orange-500
                              "
                            >
                              <CalendarDays size={17} />
                            </div>

                            <div className="min-w-0">
                              <p
                                className="
                                  text-[10px]
                                  font-bold
                                  uppercase
                                  tracking-wider
                                  text-slate-400
                                "
                              >
                                Feeding Time
                              </p>

                              <p
                                className="
                                  mt-0.5
                                  text-xs
                                  font-medium
                                  text-slate-500
                                "
                              >
                                Automatic feeder
                              </p>
                            </div>
                          </div>

                          <input
                            type="time"
                            value={schedule.time}
                            onChange={(e) =>
                              handleTimeChange(schedule, e.target.value)
                            }
                            className="
                              min-h-[42px]
                              w-full
                              rounded-xl
                              border
                              border-orange-100
                              bg-orange-50
                              px-3
                              py-2
                              text-sm
                              font-bold
                              text-orange-600
                              outline-none
                              transition
                              focus:border-orange-400
                              focus:ring-4
                              focus:ring-orange-500/10
                              sm:w-auto
                            "
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ADD SCHEDULE */}

                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="
                  mt-4
                  flex
                  min-h-[46px]
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border-2
                  border-dashed
                  border-orange-200
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-slate-400
                  transition
                  hover:border-orange-300
                  hover:bg-orange-50/50
                  hover:text-orange-500
                "
                >
                  <Plus size={18} />
                  Add Feeding Schedule
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ========================================================
          AUTOMATION MODAL
      ======================================================== */}

      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title="Create Automation Rule"
      >
        <form
          className="
            mt-2
            space-y-4
            sm:space-y-5
          "
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateRule();
          }}
        >
          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-bold
                text-slate-700
                sm:text-sm
              "
            >
              Rule Name
            </label>

            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Low Water Refill"
              required
              className={modalInputClass}
            />
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-3
            "
          >
            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-bold
                  text-slate-700
                  sm:text-sm
                "
              >
                If Sensor
              </label>

              <select
                value={ruleSensor}
                onChange={(e) => setRuleSensor(e.target.value)}
                className={modalInputClass}
              >
                <option>Water Level</option>

                <option>pH Level</option>

                <option>Temperature</option>

                <option>Ammonia</option>
              </select>
            </div>

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-bold
                  text-slate-700
                  sm:text-sm
                "
              >
                Condition
              </label>

              <select
                value={ruleCondition}
                onChange={(e) => setRuleCondition(e.target.value)}
                className={modalInputClass}
              >
                <option>Less than</option>

                <option>Greater than</option>

                <option>Equals</option>
              </select>
            </div>

            <div>
              <label
                className="
                  mb-1.5
                  block
                  text-xs
                  font-bold
                  text-slate-700
                  sm:text-sm
                "
              >
                Value
              </label>

              <input
                type="number"
                step="any"
                value={ruleValue}
                onChange={(e) => setRuleValue(e.target.value)}
                placeholder="40"
                required
                className={modalInputClass}
              />
            </div>
          </div>

          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-bold
                text-slate-700
                sm:text-sm
              "
            >
              Then Action
            </label>

            <select
              value={ruleAction}
              onChange={(e) => setRuleAction(e.target.value)}
              className={modalInputClass}
            >
              <option>Turn On Refill Valve</option>

              <option>Turn Off Refill Valve</option>

              <option>Turn On Aerator</option>

              <option>Turn Off Aerator</option>

              <option>Activate Feeder</option>

              <option>Send Notification</option>
            </select>
          </div>

          <div
            className="
              flex
              flex-col-reverse
              gap-2
              border-t
              border-slate-100
              pt-4
              sm:flex-row
              sm:justify-end
              sm:gap-3
            "
          >
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(false)}
              className="
                flex
                min-h-[44px]
                items-center
                justify-center
                gap-2
                rounded-xl
                px-5
                py-2.5
                text-sm
                font-bold
                text-slate-600
                hover:bg-slate-100
              "
            >
              <X size={17} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={savingRule}
              className="
                flex
                min-h-[44px]
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-gradient-to-r
                from-[#1749D1]
                to-[#1557C0]
                px-5
                py-2.5
                text-sm
                font-bold
                text-white
                transition
                hover:-translate-y-0.5
                hover:shadow-lg
                disabled:opacity-60
              "
            >
              {savingRule ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Save Rule
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          FEEDING MODAL
      ======================================================== */}

      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Add Feeding Schedule"
      >
        <form
          className="
            mt-2
            space-y-4
            sm:space-y-5
          "
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateSchedule();
          }}
        >
          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-bold
                text-slate-700
                sm:text-sm
              "
            >
              Schedule Name
            </label>

            <input
              type="text"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              required
              className={modalInputClass}
            />
          </div>

          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-bold
                text-slate-700
                sm:text-sm
              "
            >
              Feeding Time
            </label>

            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              required
              className={`
                ${modalInputClass}
                font-bold
              `}
            />
          </div>

          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-bold
                text-slate-700
                sm:text-sm
              "
            >
              Frequency
            </label>

            <select
              value={scheduleFrequency}
              onChange={(e) => setScheduleFrequency(e.target.value)}
              className={modalInputClass}
            >
              <option value="Daily">Daily</option>

              <option value="Weekdays">Weekdays</option>

              <option value="Weekends">Weekends</option>

              <option value="Weekly">Weekly</option>
            </select>
          </div>

          <div
            className="
              flex
              flex-col-reverse
              gap-2
              border-t
              border-slate-100
              pt-4
              sm:flex-row
              sm:justify-end
              sm:gap-3
            "
          >
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(false)}
              className="
                min-h-[44px]
                rounded-xl
                px-5
                py-2.5
                text-sm
                font-bold
                text-slate-600
                hover:bg-slate-100
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={savingSchedule}
              className="
                flex
                min-h-[44px]
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-gradient-to-r
                from-orange-500
                to-orange-400
                px-5
                py-2.5
                text-sm
                font-bold
                text-white
                transition
                hover:-translate-y-0.5
                hover:shadow-lg
                disabled:opacity-60
              "
            >
              {savingSchedule ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Save Schedule
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ============================================================
// HERO STAT
// ============================================================

function HeroStat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
        min-w-[125px]
        rounded-xl
        border
        border-white/15
        bg-white/10
        px-3
        py-2.5
        backdrop-blur-sm
        sm:min-w-[145px]
        sm:px-4
        sm:py-3
      "
    >
      <div
        className="
          flex
          items-center
          gap-2
          text-blue-100
        "
      >
        {icon}

        <span
          className="
            text-[9px]
            font-bold
            uppercase
            tracking-wider
            sm:text-[10px]
          "
        >
          {label}
        </span>
      </div>

      <p
        className="
          mt-1
          text-xl
          font-extrabold
          text-white
          sm:text-2xl
        "
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// RULE BADGE
// ============================================================

function RuleBadge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "blue" | "slate" | "orange";
}) {
  const classes = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-white text-slate-700",
    orange: "border-orange-200 bg-orange-50 text-orange-600",
  };

  return (
    <span
      className={`
        rounded-lg
        border
        px-2
        py-1
        text-[10px]
        font-bold
        sm:px-2.5
        sm:text-xs
        ${classes[variant]}
      `}
    >
      {children}
    </span>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({ type }: { type: "automation" | "schedule" }) {
  const automation = type === "automation";

  return (
    <div
      className={`
        rounded-2xl
        border
        border-dashed
        p-7
        text-center
        ${
          automation
            ? "border-blue-200 bg-blue-50/40"
            : "border-orange-200 bg-orange-50/40"
        }
      `}
    >
      <div
        className={`
          mx-auto
          mb-3
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-xl
          ${
            automation
              ? "bg-blue-100 text-blue-300"
              : "bg-orange-100 text-orange-300"
          }
        `}
      >
        {automation ? <Settings size={25} /> : <Clock size={25} />}
      </div>

      <p
        className="
          text-sm
          font-bold
          text-slate-500
        "
      >
        {automation ? "No automation rules" : "No feeding schedules"}
      </p>

      <p
        className="
          mt-1
          text-xs
          leading-5
          text-slate-400
        "
      >
        {automation
          ? "Add a rule to automate your farm equipment."
          : "Add a feeding schedule to get started."}
      </p>
    </div>
  );
}

// ============================================================
// MODAL INPUT
// ============================================================

const modalInputClass = `
  min-h-[44px]
  w-full
  rounded-xl
  border
  border-slate-200
  bg-white
  px-3.5
  py-2.5
  text-sm
  font-medium
  text-slate-700
  outline-none
  transition
  placeholder:text-slate-400
  focus:border-[#1749D1]
  focus:ring-4
  focus:ring-blue-500/10
`;
