import React from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  CheckCircle,
  Package,
} from "lucide-react";

interface CustomerPageHeroProps {
  section?: string;
  title: string;
  description: string;
  type?: "dashboard" | "orders" | "cart" | "checkout" | "success" | "default";
}

const CustomerPageHero: React.FC<CustomerPageHeroProps> = ({
  section = "CUSTOMER PORTAL",
  title,
  description,
  type = "default",
}) => {
  const getIcon = () => {
    switch (type) {
      case "dashboard":
        return LayoutDashboard;

      case "orders":
        return ShoppingBag;

      case "cart":
        return ShoppingCart;

      case "checkout":
        return CreditCard;

      case "success":
        return CheckCircle;

      default:
        return Package;
    }
  };

  const Icon = getIcon();

  return (
    <section
      className="
        relative
        mb-5
        w-full
        overflow-hidden
        rounded-[22px]
        bg-[#17365D]
        px-5
        py-6
        shadow-sm
        sm:mb-6
        sm:px-7
        sm:py-7
        lg:px-8
        lg:py-8
      "
    >
      {/* ========================================================
          BACKGROUND DECORATION
      ======================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          -right-10
          -top-16
          h-44
          w-44
          rounded-full
          bg-[#F59E0B]/20
          sm:h-52
          sm:w-52
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-24
          right-16
          h-48
          w-48
          rounded-full
          bg-white/[0.07]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-28
          -left-10
          h-48
          w-48
          rounded-full
          bg-white/[0.06]
        "
      />

      {/* ========================================================
          CONTENT
      ======================================================== */}

      <div className="relative z-10">
        {/* SECTION LABEL */}

        <div
          className="
            inline-flex
            items-center
            gap-2
            rounded-full
            bg-white/10
            px-3
            py-1.5
            backdrop-blur-sm
          "
        >
          <span
            className="
              h-2
              w-2
              rounded-full
              bg-[#F59E0B]
            "
          />

          <span
            className="
              text-[9px]
              font-extrabold
              uppercase
              tracking-[0.16em]
              text-white
              sm:text-[10px]
            "
          >
            {section}
          </span>
        </div>

        {/* TITLE */}

        <div
          className="
            mt-4
            flex
            items-start
            gap-3
          "
        >
          <div className="min-w-0 flex-1">
            <h1
              className="
                text-2xl
                font-extrabold
                tracking-tight
                text-white
                sm:text-3xl
                lg:text-[32px]
              "
            >
              {title}
            </h1>

            <p
              className="
                mt-2
                max-w-2xl
                text-xs
                leading-5
                text-blue-100
                sm:text-sm
                sm:leading-6
              "
            >
              {description}
            </p>
          </div>

          {/* ICON */}

          <div
            className="
              hidden
              h-12
              w-12
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-white/10
              text-white
              backdrop-blur-sm
              sm:flex
            "
          >
            <Icon size={22} strokeWidth={1.8} />
          </div>
        </div>

        {/* ORANGE LINE */}

        <div
          className="
            mt-4
            h-1
            w-16
            rounded-full
            bg-[#F59E0B]
            sm:mt-5
          "
        />
      </div>
    </section>
  );
};

export default CustomerPageHero;
