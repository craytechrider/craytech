import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Truck,
  Package,
  MapPin,
  Store,
  Loader2,
  RefreshCw,
} from "lucide-react";
import api from "../lib/api";

const Welcome: React.FC = () => {
  interface PublicDeliveryArea {
    id: number;
    country: string;
    region: string;
    province: string;
    municipality: string;
    barangay: string;
    is_active: boolean;
  }

  interface PublicProduct {
    id: number;
    name: string;
    description?: string | null;
    available_weight_kg?: number | null;
    price_per_kg?: number | null;
    is_available?: boolean;
    image?: string | null;
  }

  const [deliveryAreas, setDeliveryAreas] = useState<PublicDeliveryArea[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loadingPublicData, setLoadingPublicData] = useState(true);
  const [publicDataError, setPublicDataError] = useState("");

  const farmAddress =
    "Sitio Sabang, Brgy. Leuteboro I, Socorro, Oriental Mindoro, Socorro, Philippines";

  const formatDeliveryArea = (area: PublicDeliveryArea) => {
    const parts = [
      area.barangay,
      area.municipality,
      area.province,
      area.region,
      area.country,
    ].filter(Boolean);

    return parts.join(", ");
  };

  const getPublicImageUrl = (image?: string | null) => {
    if (!image) {
      return "";
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    const storageBase = (
      import.meta.env.VITE_STORAGE_URL || "http://127.0.0.1:8000/storage"
    ).replace(/\/$/, "");

    return `${storageBase}/${image.replace(/^\/+/, "")}`;
  };

  const loadPublicData = async () => {
    setLoadingPublicData(true);
    setPublicDataError("");

    const [areasResult, productsResult] = await Promise.allSettled([
      api.get("/delivery-areas"),
      api.get("/products"),
    ]);

    let loadedAnything = false;

    if (areasResult.status === "fulfilled") {
      const areaData =
        areasResult.value?.data?.data ?? areasResult.value?.data ?? [];

      if (Array.isArray(areaData)) {
        setDeliveryAreas(
          areaData.filter(
            (area: PublicDeliveryArea) => area.is_active !== false,
          ),
        );
        loadedAnything = true;
      }
    }

    if (productsResult.status === "fulfilled") {
      const productData =
        productsResult.value?.data?.data ?? productsResult.value?.data ?? [];

      if (Array.isArray(productData)) {
        setProducts(
          productData.filter(
            (product: PublicProduct) => product.is_available !== false,
          ),
        );
        loadedAnything = true;
      }
    }

    if (!loadedAnything) {
      setPublicDataError(
        "Live delivery and product information is temporarily unavailable.",
      );
    }

    setLoadingPublicData(false);
  };

  useEffect(() => {
    loadPublicData();
  }, []);
  return (
    <div className="welcome-page">
      {/* =====================================================
          ANIMATED BACKGROUND
      ====================================================== */}

      <div className="background-overlay" />

      <div className="blur-orb orb-one" />
      <div className="blur-orb orb-two" />
      <div className="blur-orb orb-three" />

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="welcome-wrapper">
        {/* =================================================
            HERO
        ================================================== */}

        <section className="welcome-hero">
          <div className="hero-copy">
            <div className="logo-wrapper">
              <div className="logo-card">
                <img src="/craytech-logo.png" alt="CRAYTECH" className="logo" />
              </div>
              <div className="logo-card">
                <img
                  src="/mamens-logo.jpg"
                  alt="Mamen's Redclaw Aqua Farm"
                  className="logo"
                />
              </div>
            </div>

            <div className="hero-brand">
              <span className="eyebrow">CRAYTECH</span>

              <h1>Mamen's Redclaw Aqua Farm</h1>

              <div className="brand-line" />

              <p className="subtitle">
                Powered by CRAYTECH Farm Management System
              </p>

              <p className="description">
                A smarter way to manage the farm, showcase available crayfish
                products, and handle customer orders — all in one place.
              </p>
            </div>

            <div className="button-group">
              <Link to="/login" className="btn btn-primary">
                LOG IN
              </Link>

              <Link to="/register" className="btn btn-secondary">
                REGISTER
              </Link>
            </div>
          </div>

          <div className="hero-panel">
            <div className="right-content">
              <span className="eyebrow">CRAYTECH PLATFORM</span>

              <h2>
                Fresh from the farm.
                <span> Simple to explore.</span>
              </h2>

              <p className="right-description">
                Discover available delivery sites, crayfish products, farm
                information, and more as you scroll through the page.
              </p>

              <div className="features">
                <div className="feature">
                  <div className="feature-icon">🦞</div>

                  <div>
                    <h3>Fresh Crayfish</h3>
                    <p>Browse available products and current farm offerings.</p>
                  </div>
                </div>

                <div className="feature">
                  <div className="feature-icon">🚚</div>

                  <div>
                    <h3>Available Delivery Sites</h3>
                    <p>Check where CRAYTECH currently supports delivery.</p>
                  </div>
                </div>

                <div className="feature">
                  <div className="feature-icon">📍</div>

                  <div>
                    <h3>Farm Information</h3>
                    <p>Learn more about the farm, products, and services.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-scroll-cue">
            <div className="scroll-gradient" />

            <div className="scroll-content">
              <span>SCROLL DOWN</span>
              <small>Read more about our farm, delivery sites & products</small>

              <div className="scroll-arrow">⌄</div>
            </div>
          </div>
        </section>

        {/* =================================================
            PUBLIC INFORMATION
        ================================================== */}

        <section className="public-info">
          <div className="section-heading">
            <span className="eyebrow">EXPLORE CRAYTECH</span>

            <h2>Available from our farm</h2>

            <p>
              Browse the current delivery coverage, available crayfish products,
              and where you can find Mamen's Redclaw Aqua Farm.
            </p>
          </div>

          {/* FARM LOCATION */}
          <article className="farm-location-card">
            <div className="farm-location-icon">
              <Store size={22} />
            </div>

            <div className="farm-location-content">
              <span className="location-label">FARM / SHOP LOCATION</span>

              <h3>Mamen's Redclaw Aqua Farm</h3>

              <p>{farmAddress}</p>
            </div>
          </article>

          {/* DELIVERY SITES */}
          <div className="public-section-header">
            <div>
              <span className="section-kicker">DELIVERY</span>
              <h3>Available Delivery Sites</h3>
              <p>Current delivery areas configured in CRAYTECH.</p>
            </div>

            <Truck size={22} />
          </div>

          {loadingPublicData ? (
            <div className="public-loading-card">
              <Loader2 size={22} className="spin" />
              <span>Loading delivery sites and products...</span>
            </div>
          ) : deliveryAreas.length > 0 ? (
            <div className="data-grid">
              {deliveryAreas.map((area) => (
                <article className="data-card" key={area.id}>
                  <div className="data-icon delivery-icon">
                    <MapPin size={20} />
                  </div>

                  <div className="data-card-body">
                    <div className="data-card-top">
                      <h4>{area.municipality || "Delivery Area"}</h4>

                      <span className="active-pill">AVAILABLE</span>
                    </div>

                    <p>{formatDeliveryArea(area)}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-public-card">
              <MapPin size={24} />
              <p>No delivery sites are currently available.</p>
            </div>
          )}

          {/* PRODUCTS */}
          <div className="public-section-header products-header">
            <div>
              <span className="section-kicker">SHOP</span>
              <h3>Available Products</h3>
              <p>Current products published by the farm.</p>
            </div>

            <Package size={22} />
          </div>

          {products.length > 0 ? (
            <div className="product-grid">
              {products.slice(0, 6).map((product) => {
                const imageUrl = getPublicImageUrl(product.image);

                return (
                  <article className="product-card" key={product.id}>
                    <div className="product-image">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="product-placeholder">🦞</div>
                      )}
                    </div>

                    <div className="product-content">
                      <h4>{product.name}</h4>

                      <p>
                        {product.description ||
                          "Fresh crayfish from Mamen's Redclaw Aqua Farm."}
                      </p>

                      <div className="product-meta">
                        <span>
                          Available:{" "}
                          {Number(product.available_weight_kg || 0).toFixed(2)}{" "}
                          kg
                        </span>

                        <strong>
                          ₱{Number(product.price_per_kg || 0).toFixed(2)}
                          /kg
                        </strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : loadingPublicData ? null : (
            <div className="empty-public-card">
              <Package size={24} />
              <p>No products are currently listed.</p>
            </div>
          )}

          {/* ERROR / RETRY */}
          {publicDataError && (
            <div className="public-data-error">
              <div>
                <strong>Live information unavailable</strong>
                <p>{publicDataError}</p>
              </div>

              <button
                type="button"
                onClick={loadPublicData}
                disabled={loadingPublicData}
              >
                {loadingPublicData ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Retry
              </button>
            </div>
          )}
        </section>

        <footer>
          © {new Date().getFullYear()} CRAYTECH · Mamen's Redclaw Aqua Farm
        </footer>
      </main>

      {/* =====================================================
          STYLES
      ====================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .welcome-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow-x: hidden;
          overflow-y: auto;
          font-family: "Segoe UI", system-ui, sans-serif;
          background-image:
            url("/background.jpg");
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
        }

        .background-overlay {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            linear-gradient(
              135deg,
              rgba(3, 18, 45, 0.82),
              rgba(16, 64, 130, 0.62),
              rgba(5, 28, 65, 0.86)
            );
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }

        .blur-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.38;
          pointer-events: none;
          animation: floatOrb 10s ease-in-out infinite;
          z-index: 0;
        }

        .orb-one {
          width: 350px;
          height: 350px;
          background: rgba(35, 115, 255, 0.55);
          top: -120px;
          left: -80px;
        }

        .orb-two {
          width: 300px;
          height: 300px;
          background: rgba(0, 180, 255, 0.30);
          right: -80px;
          bottom: -100px;
          animation-delay: -3s;
        }

        .orb-three {
          width: 220px;
          height: 220px;
          background: rgba(239, 68, 68, 0.16);
          left: 45%;
          top: 5%;
          animation-delay: -6s;
        }

        .welcome-wrapper {
          width: 100%;
          max-width: 1280px;
          padding: 18px 12px 36px;
          position: relative;
          z-index: 2;
          margin: 0 auto;
          animation: pageEnter 0.9s ease-out;
        }

        .welcome-hero {
          position: relative;
          min-height: calc(100vh - 36px);
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          border-radius: 24px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.20);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.20);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .hero-copy {
          padding: 30px 22px 120px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: #172033;
          background: rgba(255, 255, 255, 0.95);
        }

        .logo-wrapper {
          width: 100%;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 24px;
          margin: 0 auto 24px;
          animation: logoFloat 4s ease-in-out infinite;
        }

        .logo-card {
          width: 112px;
          height: 112px;
          flex: 0 0 112px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.14);
        }

        .logo {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .hero-brand {
          max-width: 620px;
        }

        .hero-brand .eyebrow,
        .section-heading .eyebrow {
          display: inline-block;
          font-size: 10px;
          letter-spacing: 1.6px;
          font-weight: 800;
          color: #ef4444;
          margin-bottom: 10px;
        }

        .hero-brand h1 {
          margin: 0;
          font-size: clamp(2rem, 8vw, 4.25rem);
          line-height: 1.02;
          font-weight: 900;
          letter-spacing: -1px;
          color: #17365d;
        }

        .brand-line {
          width: 54px;
          height: 5px;
          border-radius: 999px;
          background: linear-gradient(90deg, #1749d1, #f59e0b);
          margin-top: 14px;
          margin-bottom: 13px;
        }

        .subtitle {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: #64748b;
          font-weight: 600;
        }

        .description {
          max-width: 560px;
          margin-top: 18px;
          font-size: 14px;
          line-height: 1.75;
          color: #526176;
        }

        .button-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 24px;
          max-width: 500px;
        }

        .btn {
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            background 0.25s ease;
        }

        .btn:hover {
          transform: translateY(-2px);
        }

        .btn-primary {
          color: #ffffff;
          background: linear-gradient(135deg, #ff3b45, #e62935);
          box-shadow: 0 10px 25px rgba(230, 41, 53, 0.25);
        }

        .btn-primary:hover {
          box-shadow: 0 14px 28px rgba(230, 41, 53, 0.35);
        }

        .btn-secondary {
          color: #e62935;
          border: 2px solid #ef4444;
          background: rgba(255, 255, 255, 0.78);
        }

        .btn-secondary:hover {
          background: #fff1f2;
          border-color: #ef4444;
        }

        .hero-panel {
          position: relative;
          padding: 34px 22px 120px;
          display: flex;
          align-items: center;
          color: white;
          background:
            linear-gradient(
              135deg,
              rgba(23, 73, 209, 0.96),
              rgba(16, 45, 121, 0.94)
            );
        }

        .hero-panel::before {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.07);
          top: -120px;
          right: -90px;
        }

        .hero-panel::after {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.10);
          bottom: -70px;
          left: -60px;
        }

        .right-content {
          position: relative;
          z-index: 2;
          width: 100%;
        }

        .right-content .eyebrow {
          display: inline-block;
          font-size: 10px;
          letter-spacing: 1.8px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.72);
          margin-bottom: 12px;
        }

        .right-content h2 {
          margin: 0;
          font-size: clamp(2rem, 7vw, 3.4rem);
          line-height: 1.12;
          font-weight: 900;
          max-width: 500px;
        }

        .right-content h2 span {
          color: #ff6b73;
        }

        .right-description {
          max-width: 520px;
          margin-top: 14px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 14px;
          line-height: 1.75;
        }

        .features {
          margin-top: 26px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 14px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.10);
          transition:
            transform 0.3s ease,
            background 0.3s ease;
          animation: featureEnter 0.8s ease both;
        }

        .feature:nth-child(1) {
          animation-delay: 0.25s;
        }

        .feature:nth-child(2) {
          animation-delay: 0.4s;
        }

        .feature:nth-child(3) {
          animation-delay: 0.55s;
        }

        .feature:hover {
          transform: translateX(4px);
          background: rgba(255, 255, 255, 0.13);
        }

        .feature-icon {
          flex-shrink: 0;
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: rgba(239, 68, 68, 0.16);
          border: 1px solid rgba(239, 68, 68, 0.24);
          color: #ff6b73;
          font-size: 21px;
        }

        .feature h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
        }

        .feature p {
          margin: 4px 0 0;
          font-size: 12px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.70);
        }

        .hero-scroll-cue {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 112px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
          pointer-events: none;
          z-index: 5;
        }

        .scroll-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(8, 24, 54, 0),
            rgba(8, 24, 54, 0.85) 65%,
            rgba(8, 24, 54, 0.96)
          );
        }

        .scroll-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding-bottom: 12px;
          text-align: center;
          color: white;
        }

        .scroll-content span {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .scroll-content small {
          max-width: 280px;
          padding: 0 12px;
          font-size: 10px;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.72);
        }

        .scroll-arrow {
          margin-top: 2px;
          font-size: 22px;
          line-height: 1;
          color: #f59e0b;
          animation: bounceArrow 1.6s ease-in-out infinite;
        }

        .public-info {
          margin-top: 18px;
          padding: 30px 8px 18px;
        }

        .farm-location-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-top: 24px;
          padding: 18px;
          border-radius: 20px;
          background: linear-gradient(
            135deg,
            rgba(23, 54, 93, 0.96),
            rgba(23, 73, 209, 0.92)
          );
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
        }

        .farm-location-icon {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          color: white;
          background: rgba(239, 68, 68, 0.16);
          border: 1px solid rgba(245, 158, 11, 0.25);
        }

        .farm-location-content {
          min-width: 0;
        }

        .location-label {
          display: inline-block;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          color: #b9d5ff;
        }

        .farm-location-content h3 {
          margin: 4px 0 0;
          color: white;
          font-size: 17px;
          font-weight: 900;
        }

        .farm-location-content p {
          margin: 6px 0 0;
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
          line-height: 1.6;
        }

        .public-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-top: 28px;
          color: white;
        }

        .public-section-header > svg {
          flex-shrink: 0;
          color: #f59e0b;
        }

        .public-section-header .section-kicker {
          display: block;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          color: #ff6b73;
        }

        .public-section-header h3 {
          margin: 4px 0 0;
          font-size: 20px;
          font-weight: 900;
        }

        .public-section-header p {
          margin: 4px 0 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.64);
        }

        .products-header {
          margin-top: 32px;
        }

        .data-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .data-card {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          padding: 15px;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 12px 25px rgba(0, 0, 0, 0.13);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .data-icon {
          display: flex;
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .delivery-icon {
          color: #cfe0ff;
          background: rgba(23, 73, 209, 0.28);
        }

        .data-card-body {
          min-width: 0;
          flex: 1;
        }

        .data-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .data-card-top h4 {
          min-width: 0;
          margin: 0;
          color: white;
          font-size: 14px;
          font-weight: 900;
        }

        .active-pill {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 4px 7px;
          background: rgba(16, 185, 129, 0.16);
          color: #a7f3d0;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .data-card-body p {
          margin: 5px 0 0;
          color: rgba(255, 255, 255, 0.65);
          font-size: 11px;
          line-height: 1.55;
        }

        .product-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 13px;
          margin-top: 16px;
        }

        .product-card {
          overflow: hidden;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.14);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .product-image {
          height: 155px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: linear-gradient(
            135deg,
            rgba(23, 73, 209, 0.30),
            rgba(245, 158, 11, 0.16)
          );
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-placeholder {
          font-size: 48px;
        }

        .product-content {
          padding: 14px;
        }

        .product-content h4 {
          margin: 0;
          color: white;
          font-size: 15px;
          font-weight: 900;
        }

        .product-content p {
          min-height: 38px;
          margin: 6px 0 0;
          color: rgba(255, 255, 255, 0.64);
          font-size: 11px;
          line-height: 1.55;
        }

        .product-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.10);
          color: rgba(255, 255, 255, 0.66);
          font-size: 10px;
        }

        .product-meta strong {
          flex-shrink: 0;
          color: #ff6b73;
          font-size: 12px;
        }

        .public-loading-card,
        .empty-public-card {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 16px;
          min-height: 90px;
          padding: 16px;
          border-radius: 17px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 255, 255, 0.70);
          text-align: center;
          font-size: 12px;
        }

        .public-data-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 16px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(245, 158, 11, 0.25);
          background: rgba(245, 158, 11, 0.09);
        }

        .public-data-error strong {
          display: block;
          color: #fde68a;
          font-size: 12px;
          font-weight: 900;
        }

        .public-data-error p {
          margin: 4px 0 0;
          color: rgba(255, 255, 255, 0.64);
          font-size: 10px;
          line-height: 1.5;
        }

        .public-data-error button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-shrink: 0;
          border: 0;
          border-radius: 10px;
          padding: 9px 11px;
          background: #f59e0b;
          color: white;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .spin {
          animation: spin 0.9s linear infinite;
        }



        .section-heading {
          text-align: center;
          color: white;
          max-width: 680px;
          margin: 0 auto;
        }

        .section-heading .eyebrow {
          color: #ff6b73;
          margin-bottom: 8px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: clamp(1.8rem, 6vw, 2.6rem);
          font-weight: 900;
        }

        .section-heading p {
          margin-top: 10px;
          font-size: 13px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.74);
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 22px;
        }

        .info-card {
          padding: 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 18px 35px rgba(0, 0, 0, 0.16);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .info-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.10);
          font-size: 19px;
        }

        .info-card h3 {
          margin-top: 12px;
          margin-bottom: 0;
          font-size: 15px;
          font-weight: 800;
          color: white;
        }

        .info-card p {
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.68);
        }

        footer {
          text-align: center;
          margin-top: 18px;
          color: rgba(255, 255, 255, 0.60);
          font-size: 11px;
        }

        @keyframes pageEnter {
          from {
            opacity: 0;
            transform: translateY(25px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes logoFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes floatOrb {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }

          50% {
            transform: translate(30px, -25px) scale(1.08);
          }
        }

        @keyframes featureEnter {
          from {
            opacity: 0;
            transform: translateX(25px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounceArrow {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.75;
          }

          50% {
            transform: translateY(5px);
            opacity: 1;
          }
        }

        @media (min-width: 760px) {
          .welcome-wrapper {
            padding: 28px 20px 48px;
          }

          .welcome-hero {
            min-height: auto;
            grid-template-columns: 1fr 1fr;
          }

          .hero-copy {
            padding: 50px 42px 130px;
          }

          .hero-panel {
            padding: 50px 42px 130px;
          }

          .info-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }

        @media (min-width: 1050px) {
          .welcome-wrapper {
            padding: 35px 25px 56px;
          }

          .welcome-hero {
            min-height: 640px;
          }

          .hero-copy {
            padding: 64px;
          }

          .hero-panel {
            padding: 64px;
          }
        }


        @media (min-width: 760px) {
          .data-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .product-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .farm-location-card {
            padding: 20px;
          }
        }

        @media (min-width: 1050px) {
          .data-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .product-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 520px) {
          .welcome-wrapper {
            padding: 10px 10px 28px;
          }

          .welcome-hero {
            border-radius: 20px;
            min-height: calc(100vh - 20px);
          }

          .hero-copy,
          .hero-panel {
            padding-left: 20px;
            padding-right: 20px;
          }

          .hero-copy {
            padding-top: 24px;
            padding-bottom: 105px;
          }

          .hero-panel {
            padding-top: 26px;
            padding-bottom: 105px;
          }

          .logo-wrapper {
            width: 74px;
            height: 74px;
            border-radius: 18px;
          }

          .logo {
            width: 62px;
            height: 62px;
          }

          .button-group {
            grid-template-columns: 1fr;
          }

          .btn {
            min-height: 48px;
          }

          .hero-scroll-cue {
            height: 98px;
          }

          .public-info {
            padding-left: 4px;
            padding-right: 4px;
          }
        }

      `}</style>
    </div>
  );
};

export default Welcome;
