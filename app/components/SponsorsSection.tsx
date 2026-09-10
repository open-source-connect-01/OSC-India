"use client";
import React from "react";
import Image from "next/image";

type Sponsor = {
  name: string;
  url: string;
  src?: string;
  customRender?: React.ReactNode;
};

export default function SponsorsSection() {
  const platinumSponsors: Sponsor[] = [
    {
      name: "NexFellow",
      src: "/sponsers/nexfellow.svg",
      url: "https://nexfellow.com",
    },
  ];

  const goldSponsors: Sponsor[] = [
    {
      name: "Sylus AI",
      url: "https://sylusai.com",
      customRender: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            width: "100%",
            height: "100%",
          }}
        >
          <div style={{ position: "relative", width: "32px", height: "32px", flexShrink: 0 }}>
            <Image
              src="/sponsers/sylus.png"
              alt="Sylus AI Logo"
              fill
              sizes="32px"
              style={{ objectFit: "contain" }}
            />
          </div>
          <span
            style={{
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "17px",
              letterSpacing: "-0.2px",
            }}
          >
            Sylus AI
          </span>
        </div>
      ),
    },
    {
      name: "TruScholar",
      src: "/sponsers/truscholar.svg",
      url: "https://truscholar.io",
    },
  ];

  const silverSponsors: Sponsor[] = [
    {
      name: "CodeCrafters",
      url: "https://codecrafters.io",
      customRender: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            width: "100%",
            height: "100%",
          }}
        >
          <svg
            width="26"
            height="18"
            viewBox="0 0 27.3211 18.7013"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <g clipPath="url(#clip_cc_sponsors)">
              <path
                d="M27.3153 10.961C27.3397 11.0764 27.2859 11.1948 27.1842 11.2535L14.8243 18.3902C14.1052 18.805 13.2189 18.805 12.4988 18.3902L0.13697 11.2525C0.035226 11.1938 -0.0185809 11.0754 0.0058768 10.96C0.116425 10.4376 0.257301 9.92689 0.42557 9.42795C0.480355 9.26458 0.672103 9.19218 0.821784 9.27827L13.3187 16.4933C13.53 16.6156 13.7912 16.6156 14.0025 16.4933L26.4984 9.27827C26.6481 9.19218 26.8398 9.2636 26.8946 9.42795C27.0629 9.92689 27.2038 10.4376 27.3143 10.96L27.3153 10.961Z"
                fill="#F3F4F6"
              />
              <path
                d="M25.5671 7.13087L15.8496 12.7414C15.3937 13.0046 14.8233 12.6759 14.8233 12.1496V0.273918C14.8233 0.110541 14.9652 -0.0146822 15.1266 0.00194902C15.647 0.0557559 16.1597 0.138912 16.6615 0.248482C16.7868 0.275875 16.8748 0.387402 16.8748 0.51556V9.78012L24.4508 5.40611C24.5692 5.33763 24.7218 5.36698 24.805 5.47655C25.1141 5.88548 25.4008 6.31104 25.6639 6.75324C25.7422 6.88531 25.6991 7.05554 25.5671 7.13184V7.13087Z"
                fill="#F3F4F6"
              />
              <path
                d="M10.4465 0.531246V9.78015L2.86953 5.40517C2.75115 5.33668 2.59854 5.36603 2.51538 5.4756C2.20623 5.88454 1.91959 6.3101 1.65643 6.75229C1.57816 6.88436 1.62121 7.05459 1.75328 7.1309L11.4718 12.7415C11.9277 13.0046 12.498 12.6759 12.498 12.1496V0.292539C12.498 0.12427 12.3474 -0.00388765 12.182 0.0225266L10.6774 0.260255C10.5443 0.280799 10.4465 0.39624 10.4465 0.530267V0.531246Z"
                fill="#F3F4F6"
              />
            </g>
            <defs>
              <clipPath id="clip_cc_sponsors">
                <rect width="27.3211" height="18.7013" fill="white" />
              </clipPath>
            </defs>
          </svg>
          <span
            style={{
              color: "#F3F4F6",
              fontWeight: 700,
              fontSize: "17px",
              letterSpacing: "-0.2px",
            }}
          >
            CodeCrafters
          </span>
        </div>
      ),
    },
  ];

  return (
    <section
      id="sponsors"
      className="sponsors-section"
      style={{
        background: "#080808",
        padding: "90px clamp(20px, 6vw, 120px)",
      }}
    >
      <div style={{ width: "100%", textAlign: "center" }}>
        {/* Heading */}
        <h2
          style={{
            fontSize: "clamp(30px, 4.5vw, 48px)",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            lineHeight: 1.2,
            marginBottom: "16px",
          }}
        >
          <span style={{ color: "#ffffff" }}>Our Sponsors . </span>
        </h2>

        <p
          style={{
            color: "#9ca3af",
            fontSize: "15px",
            lineHeight: 1.6,
            marginBottom: "48px",
            maxWidth: "520px",
            margin: "0 auto 48px",
          }}
        >
          We are proud to be supported by industry leaders who believe in the power of open source in India.
        </p>

        {/* Main Sponsors Showcase Container */}
        <div
          style={{
            background: "#0d0d0d",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "clamp(36px, 5vw, 48px) clamp(16px, 4vw, 36px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "40px",
            maxWidth: "960px",
            margin: "0 auto",
          }}
        >
          {/* Platinum Tier */}
          <div style={{ width: "100%" }}>
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#e5e7eb",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              Platinum Sponsor
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
              {platinumSponsors.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  style={{
                    position: "relative",
                    width: "clamp(220px, 60vw, 250px)",
                    height: "88px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px 18px",
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "rgba(255, 255, 255, 0.35)";
                    el.style.transform = "translateY(-3px)";
                    el.style.boxShadow = "0 8px 24px -4px rgba(0, 0, 0, 0.6), 0 0 16px rgba(255, 255, 255, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "rgba(255, 255, 255, 0.12)";
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow = "none";
                  }}
                >
                  {s.customRender ? (
                    s.customRender
                  ) : s.src ? (
                    <Image
                      src={s.src}
                      alt={s.name}
                      fill
                      sizes="250px"
                      style={{ objectFit: "contain", padding: "12px 16px" }}
                    />
                  ) : null}
                </a>
              ))}
            </div>
          </div>

          {/* Gold Tier */}
          <div style={{ width: "100%" }}>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#FF7518",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginBottom: "18px",
                textAlign: "center",
              }}
            >
              Gold Sponsors
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "18px", flexWrap: "wrap" }}>
              {goldSponsors.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  style={{
                    position: "relative",
                    width: "clamp(180px, 45vw, 210px)",
                    height: "70px",
                    borderRadius: "6px",
                    overflow: "hidden",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 16px",
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "rgba(255, 117, 24, 0.45)";
                    el.style.transform = "translateY(-2px)";
                    el.style.boxShadow = "0 6px 20px -4px rgba(0, 0, 0, 0.5), 0 0 14px rgba(255, 117, 24, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow = "none";
                  }}
                >
                  {s.customRender ? (
                    s.customRender
                  ) : s.src ? (
                    <Image
                      src={s.src}
                      alt={s.name}
                      fill
                      sizes="210px"
                      style={{ objectFit: "contain", padding: "10px 14px" }}
                    />
                  ) : null}
                </a>
              ))}
            </div>
          </div>

          {/* Silver Tier */}
          <div style={{ width: "100%" }}>
            <div
              style={{
                fontSize: "11.5px",
                fontWeight: 700,
                color: "#9ca3af",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              Silver Sponsor
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
              {silverSponsors.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  style={{
                    position: "relative",
                    width: "clamp(160px, 40vw, 190px)",
                    height: "62px",
                    borderRadius: "6px",
                    overflow: "hidden",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px 14px",
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "rgba(255, 255, 255, 0.25)";
                    el.style.transform = "translateY(-2px)";
                    el.style.boxShadow = "0 6px 18px -4px rgba(0, 0, 0, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "rgba(255, 255, 255, 0.06)";
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow = "none";
                  }}
                >
                  {s.customRender ? (
                    s.customRender
                  ) : s.src ? (
                    <Image
                      src={s.src}
                      alt={s.name}
                      fill
                      sizes="190px"
                      style={{ objectFit: "contain", padding: "8px 12px" }}
                    />
                  ) : null}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
