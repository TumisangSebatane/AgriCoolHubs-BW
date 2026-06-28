import React, { useState } from "react";
import { 
  Building2, 
  Sun, 
  Users, 
  BarChart3, 
  Construction, 
  CheckCircle, 
  MapPin, 
  Mail, 
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  Share2,
  Database,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
  Heart,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [activeTab, setActiveTab] = useState<"landing" | "admin">("landing");
  const [formType, setFormType] = useState<"inquiry" | "pilot" | "support">("inquiry");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [category, setCategory] = useState("General Inquiry");
  const [orgType, setOrgType] = useState("Individual Smallholder Farmer");
  const [farmersReached, setFarmersReached] = useState("");
  const [supportType, setSupportType] = useState("Financial Support/Grant");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [adminNotificationCount, setAdminNotificationCount] = useState(0);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let submitBody = {};
    if (formType === "inquiry") {
      submitBody = { name, org, email, country, category, message };
    } else if (formType === "pilot") {
      submitBody = { 
        name, 
        org: org || "Individual Farm", 
        email, 
        country, 
        category: `Pilot Participation (${orgType}) - Reaching ${farmersReached} farmers`, 
        message: `Phone: ${phone}, District: ${district}. Motivation: ${message}` 
      };
    } else if (formType === "support") {
      submitBody = { 
        name, 
        org, 
        email, 
        country: "Global", 
        category: `Support: ${supportType}`, 
        message 
      };
    }

    try {
      const res = await fetch("/api/inquiries/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitBody),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setAdminNotificationCount((prev) => prev + 1);
        
        // Reset fields
        setName("");
        setOrg("");
        setEmail("");
        setCountry("");
        setPhone("");
        setDistrict("");
        setMessage("");
        setFarmersReached("");
      }
    } catch (err) {
      console.error("Form submission failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminNotification = () => {
    setAdminNotificationCount((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary-fixed selection:text-on-primary-fixed">
      
      {/* Top Navigation Bar */}
      <header className="fixed top-0 w-full z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant h-16">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-6 md:px-12 h-full">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab("landing")}>
            <img 
              alt="Agricool Hubs Logo" 
              className="h-10 w-auto object-contain" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6Fd7FMYKAFOJhrx8BCsosldpISqoZpVd5H4k13fKpYTfX6Ep2EcY8IeNcIxx2YWUGBXRbDfPyqHn-ljjd9AUxla-2b-e_xNqr7IH-7o7ycq-CjGY39AbentBy7QL-xVfAlhIxFeOQxBDbdOx85MAHsRH-bhN1gBJN942JAbB29FAC31fV_fhUdfYb6ps0AqYrq0oM4U4O4cgPM-Q_SMnA6gSRieDb95s5dYjrT3SpYp7ICe_OFBrkFQ31vi9hrH_x_g"
            />
            <span className="font-bold text-lg text-primary tracking-tight">Agricool Hubs</span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex gap-8 items-center">
            <button 
              onClick={() => { setActiveTab("landing"); setTimeout(() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }), 100); }} 
              className={`text-sm font-medium transition-colors ${activeTab === "landing" ? "text-primary hover:text-primary/80" : "text-on-surface-variant hover:text-primary"}`}
            >
              About
            </button>
            <button 
              onClick={() => { setActiveTab("landing"); setTimeout(() => document.getElementById("pilot")?.scrollIntoView({ behavior: "smooth" }), 100); }} 
              className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
            >
              Pilot Programme
            </button>
            <button 
              onClick={() => { setActiveTab("landing"); setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 100); }} 
              className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
            >
              Contact
            </button>
            
            {/* Google Forms sync / Admin Dashboard Router */}
            <button 
              onClick={() => { setActiveTab(activeTab === "admin" ? "landing" : "admin"); }} 
              className={`text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "admin" 
                  ? "bg-primary text-on-primary" 
                  : "bg-surface-container hover:bg-surface-container-high text-primary border border-outline-variant"
              }`}
            >
              <Database className="w-4 h-4" /> 
              Admin Portal
              {adminNotificationCount > 0 && (
                <span className="bg-secondary text-on-secondary-container text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold animate-bounce">
                  {adminNotificationCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setActiveTab("landing"); setTimeout(() => document.getElementById("pilot")?.scrollIntoView({ behavior: "smooth" }), 100); }} 
              className="bg-primary text-on-primary px-5 py-2 rounded-xl text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md"
            >
              Join Waitlist
            </button>
          </nav>

          {/* Mobile Menu Icon */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-primary p-1">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 w-full bg-surface border-b border-outline-variant z-30 flex flex-col p-6 gap-4 md:hidden shadow-xl"
          >
            <button 
              onClick={() => { setActiveTab("landing"); setMobileMenuOpen(false); setTimeout(() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }), 100); }}
              className="text-left font-bold text-sm text-on-surface p-2 rounded hover:bg-surface-container"
            >
              About
            </button>
            <button 
              onClick={() => { setActiveTab("landing"); setMobileMenuOpen(false); setTimeout(() => document.getElementById("pilot")?.scrollIntoView({ behavior: "smooth" }), 100); }}
              className="text-left font-bold text-sm text-on-surface p-2 rounded hover:bg-surface-container"
            >
              Pilot Programme
            </button>
            <button 
              onClick={() => { setActiveTab("landing"); setMobileMenuOpen(false); setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 100); }}
              className="text-left font-bold text-sm text-on-surface p-2 rounded hover:bg-surface-container"
            >
              Contact
            </button>
            <button 
              onClick={() => { setActiveTab("admin"); setMobileMenuOpen(false); }}
              className="text-left font-bold text-sm text-primary p-2 rounded bg-primary-fixed/50 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5"><Database className="w-4 h-4" /> Go to Workspace Admin</span>
              {adminNotificationCount > 0 && (
                <span className="bg-secondary text-on-secondary-container text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {adminNotificationCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setActiveTab("landing"); setMobileMenuOpen(false); setTimeout(() => document.getElementById("pilot")?.scrollIntoView({ behavior: "smooth" }), 100); }}
              className="bg-primary text-on-primary font-bold text-center py-3 rounded-xl text-sm"
            >
              Join Waitlist
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className="pt-16 max-w-7xl mx-auto px-6 md:px-12 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === "landing" ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-24"
            >
              
              {/* Hero Section */}
              <section className="relative min-h-[75vh] flex items-center py-12 md:py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
                  
                  {/* Left Column: Text */}
                  <div className="space-y-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold shadow-sm">
                      <Construction className="w-3.5 h-3.5" /> Coming Soon
                    </span>
                    <h1 className="text-[38px] md:text-5xl font-extrabold text-primary leading-tight tracking-tight">
                      Preserving Harvests.<br />
                      Empowering Farmers.<br />
                      Building Climate Resilience.
                    </h1>
                    <p className="text-base md:text-lg text-on-surface-variant leading-relaxed max-w-lg">
                      Agricool Hubs is developing modular, solar-powered agricultural preservation hubs to reduce post-harvest losses and improve food security across Botswana and Southern Africa.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-4">
                      <button 
                        onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
                        className="h-12 px-6 bg-primary text-on-primary rounded-xl font-bold hover:shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5"
                      >
                        Learn More <ArrowRight className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => document.getElementById("pilot")?.scrollIntoView({ behavior: "smooth" })}
                        className="h-12 px-6 bg-secondary-container text-on-secondary-container rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all text-sm flex items-center justify-center"
                      >
                        Join the Pilot Programme
                      </button>
                      <button 
                        onClick={() => { setFormType("support"); document.getElementById("pilot")?.scrollIntoView({ behavior: "smooth" }); }}
                        className="h-12 px-6 border border-primary text-primary rounded-xl font-bold hover:bg-primary-fixed active:scale-95 transition-all text-sm flex items-center justify-center"
                      >
                        Support the Mission
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Beautiful Render Box */}
                  <div className="relative">
                    <div className="p-4 bg-white/40 backdrop-blur-sm rounded-2xl border border-outline-variant shadow-xl">
                      <img 
                        className="w-full h-[320px] md:h-[450px] object-cover rounded-xl" 
                        alt="3D architecture rendering of a modular agricultural hub with solar panels on roof surrounded by crops"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0gIig8uJoiF8sUUv8W4-2zwdoS52muoX-zNo-nL3OWEml25dQBPmUNEaCkzj3xplouBaC8bsDJzdyAsnbppEXCHDNEtTH_sgqJP7nBYv6BFBHmP-9RwvqyzJ0OmIPNE-EWb6vYLfSJKxCAB0DmbhGkiV2mbpjQFxhPSTaM4hFCvs_6__ZQSHYu7zyUhr8bBddlnSnKCZt4KcSx7NRObb9JQ_SIWj_2_pZl-A8ZrU--8UEtnFRFy6R"
                      />
                    </div>
                    {/* Glowing design highlights */}
                    <div className="absolute -top-6 -right-6 w-32 h-32 bg-secondary-container/15 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary-container/15 rounded-full blur-3xl pointer-events-none"></div>
                  </div>
                </div>
              </section>

              {/* What We Do Section */}
              <section id="about" className="py-12 bg-surface-container-low -mx-6 md:-mx-12 px-6 md:px-12 rounded-3xl border border-outline-variant/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                  
                  {/* Left Column: Description & Checkmarks */}
                  <div className="space-y-6">
                    <h2 className="text-headline-lg font-bold text-primary">What We Do</h2>
                    <p className="text-base text-on-surface-variant leading-relaxed">
                      Agricool Hubs designs and deploys modular, solar-powered cold storage and preservation infrastructure that meets the unique needs of Botswana's agricultural sector.
                    </p>
                    <ul className="space-y-3.5 pt-2">
                      {[
                        "Solar-powered cold storage",
                        "Community preservation hubs",
                        "Cold-chain solutions",
                        "Climate-smart agriculture",
                        "Cooling-as-a-Service model"
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                          <span className="text-sm font-medium text-on-surface">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right Column: Grid of Images */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="pt-8 space-y-4">
                      <img 
                        className="w-full h-56 object-cover rounded-2xl border border-outline-variant shadow-sm" 
                        alt="Peppers and tomatoes inside cold storage unit"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYWD_RrRb7halhkNYj6pjkHPSUoBkDfSVcopZychIr-g802RFYaJwiqJWpHGRtYvcrGKWqWfVGGlunqG5ikk1QEuiUJT5o3bf9cIIzMVU6AZf-Cm3dhg_WmZ5rnNe24eQGnyKcfoBE24HHjzIs_sYuUgnc6NSVaq06gV9Of9FARNCXYQtNTm4lpnklRmx1urprs0eVPdpLM3LWD8S8Vct8m7U2C4fEjT-DDNnmj7CiNCYzR1oyOBp7"
                      />
                      <img 
                        className="w-full h-40 object-cover rounded-2xl border border-outline-variant shadow-sm" 
                        alt="Wide solar panel farm setup"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCed2pX0Yaw5AoFpgo3EUD5BKjYJFQ-fTmpVksmTIw34O0NOKLcPj6aD6m5P-rR_GV9RBhLTY10v4xV-eRSsX0BYBDu9D98u5ieu2oysgouqCuFcbCY55-L79TI0iViQPrz_Q0b3HrCDt6dPLihToYumYWYd4R7AeS89nxHENuG2WOHzc2RijmAsy3pOSEzXFOvToIt2yD3L-ORF99fUOjCupBAdSTLvuCxTynAOu3vB6fXfmj7JYma"
                      />
                    </div>
                    <div className="space-y-4">
                      <img 
                        className="w-full h-40 object-cover rounded-2xl border border-outline-variant shadow-sm" 
                        alt="Farmer smiling using digital tablet"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfQjI55khAMdNExeenGFUEco-RnoQzcXjxpVrzK3grAw9FCbUfRcLfaKxQ8q1Q89iHWmiWvC7yDfWDr9d3J9ZjWhrxjrfJ9gGussa6bmmf2Ix-CVMUDjcbHAT4TVxkg3XyzNVufl1cwOlSNXmh_dALmzIG4v-U5aipymT_46230hotk1xGQ87IZMt9iiK5awMVkCFScsQ98fPeAfu9r7SRI5EL6LOzRjfn2seENSeEqj9XsL65m8eJ"
                      />
                      <img 
                        className="w-full h-56 object-cover rounded-2xl border border-outline-variant shadow-sm" 
                        alt="Traditional geometric pattern"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtXkFnwN03alQnBAJDOdlVHUAqkH-YFZNtScpmbVlrQ0rgjk0YTbKRosertSxDqh9bHxQAFnpkhNJKAzZf5uTfzM_C3Jy7VjXXg_x6-CYVckj3nybJVoH7_CzPleU4ACIeisbup_El6-UZiiMGpbcpyQE-y0w-6vTEJOTf8FQbzvfpIQF7Iljp0RQsB7YXva_hHlpFoM_vHQYX18jCuNhBabzzAjQWWkny4Cd2-hJvzSN8lmfjIbiV"
                      />
                    </div>
                  </div>

                </div>
              </section>

              {/* How We Do It Section */}
              <section className="space-y-12">
                <div className="text-center space-y-3">
                  <h2 className="text-headline-lg font-bold text-primary">How We Do It</h2>
                  <div className="w-16 h-1 bg-secondary mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Step 1 */}
                  <div className="p-6 bg-surface-container rounded-2xl border border-outline-variant/30 hover:border-primary transition-all group flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-headline-md font-bold text-primary">Build</h3>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        Build modular preservation hubs designed for quick deployment and durability.
                      </p>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="p-6 bg-surface-container rounded-2xl border border-outline-variant/30 hover:border-primary transition-all group flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <Sun className="w-6 h-6" />
                      </div>
                      <h3 className="text-headline-md font-bold text-primary">Power</h3>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        Power them using 100% renewable solar energy to ensure low operating costs.
                      </p>
                    </div>
                  </div>
                  {/* Step 3 */}
                  <div className="p-6 bg-surface-container rounded-2xl border border-outline-variant/30 hover:border-primary transition-all group flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="text-headline-md font-bold text-primary">Partner</h3>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        Partner with farming communities to ensure local ownership and impact.
                      </p>
                    </div>
                  </div>
                  {/* Step 4 */}
                  <div className="p-6 bg-surface-container rounded-2xl border border-outline-variant/30 hover:border-primary transition-all group flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <h3 className="text-headline-md font-bold text-primary">Monitor</h3>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        Monitor and improve operations using real-time data and agricultural research.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Why We Do It Section */}
              <section className="bg-primary text-on-primary rounded-3xl p-8 md:p-16 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-container/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 space-y-12">
                  <h2 className="text-headline-lg font-bold text-center text-on-primary">Why We Do It</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center space-y-2">
                      <div className="text-5xl font-extrabold text-secondary-container">50%</div>
                      <p className="text-sm text-on-primary/80">
                        of produce can be lost after harvest due to lack of cooling.
                      </p>
                    </div>
                    <div className="p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-secondary-container/15 flex items-center justify-center mx-auto text-secondary-container">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-on-primary">Income Loss</h3>
                      <p className="text-sm text-on-primary/80">
                        Farmers lose vital household income without preservation infrastructure.
                      </p>
                    </div>
                    <div className="p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-secondary-container/15 flex items-center justify-center mx-auto text-secondary-container">
                        <Heart className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-on-primary">Climate Impact</h3>
                      <p className="text-sm text-on-primary/80">
                        Food waste contributes significantly to food insecurity and greenhouse gases.
                      </p>
                    </div>
                  </div>

                  <div className="max-w-3xl mx-auto text-center space-y-4 pt-4 border-t border-white/10">
                    <span className="text-5xl font-serif text-secondary-container/40 leading-none">“</span>
                    <blockquote className="text-lg md:text-xl font-medium italic text-on-primary">
                      We believe every farmer deserves access to affordable preservation infrastructure that protects their harvest and strengthens their livelihoods.
                    </blockquote>
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary-container">Our Shared Mission</p>
                  </div>
                </div>
              </section>

              {/* Inquiry & Pilot Form Selection Section */}
              <section id="pilot" className="space-y-8 scroll-mt-20">
                <div className="text-center space-y-3 max-w-2xl mx-auto">
                  <h2 className="text-headline-lg font-bold text-primary">Help Us Build the Future of Agricultural Preservation</h2>
                  <p className="text-sm text-on-surface-variant">Select the category that best describes your interest to get started.</p>
                </div>

                <div className="flex flex-wrap justify-center gap-2.5">
                  <button 
                    onClick={() => { setFormType("inquiry"); setCategory("General Inquiry"); }}
                    className={`h-11 px-5 rounded-full font-bold text-xs border transition-all ${
                      formType === "inquiry" 
                        ? "bg-primary-fixed border-primary text-primary shadow-sm" 
                        : "border-outline text-on-surface-variant hover:bg-surface-variant"
                    }`}
                  >
                    Ask a Question
                  </button>
                  <button 
                    onClick={() => { setFormType("pilot"); setCategory("Pilot Participation"); }}
                    className={`h-11 px-5 rounded-full font-bold text-xs border transition-all ${
                      formType === "pilot" 
                        ? "bg-primary-fixed border-primary text-primary shadow-sm" 
                        : "border-outline text-on-surface-variant hover:bg-surface-variant"
                    }`}
                  >
                    Participate in a Pilot
                  </button>
                  <button 
                    onClick={() => { setFormType("support"); setCategory("Support Agricool"); }}
                    className={`h-11 px-5 rounded-full font-bold text-xs border transition-all ${
                      formType === "support" 
                        ? "bg-primary-fixed border-primary text-primary shadow-sm" 
                        : "border-outline text-on-surface-variant hover:bg-surface-variant"
                    }`}
                  >
                    Support Agricool Hubs
                  </button>
                </div>

                {/* Form Rendering Box */}
                <div className="max-w-3xl mx-auto bg-surface-container-lowest p-6 md:p-10 rounded-3xl border border-outline-variant shadow-xl relative overflow-hidden">
                  
                  {submitSuccess ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12 space-y-4"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                        <CheckCircle className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-bold text-primary">Thank you for your submission!</h3>
                      <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                        Your inquiry has been logged securely. Our team in Botswana will review your request and get in touch with you shortly.
                      </p>
                      <div className="pt-2">
                        <button 
                          onClick={() => setSubmitSuccess(false)}
                          className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-xl text-xs hover:brightness-110 transition-all"
                        >
                          Submit another request
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                      
                      {/* Form 1: General Inquiry */}
                      {formType === "inquiry" && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Name</label>
                              <input 
                                required
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Org (Optional)</label>
                              <input 
                                type="text" 
                                value={org}
                                onChange={(e) => setOrg(e.target.value)}
                                placeholder="Organization name" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Email</label>
                              <input 
                                required
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@example.com" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Country</label>
                              <input 
                                type="text" 
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="Your country" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-2">Category</label>
                            <select 
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface font-medium"
                            >
                              <option>General Inquiry</option>
                              <option>Media / Press</option>
                              <option>Investor Relations</option>
                              <option>Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-2">Message</label>
                            <textarea 
                              required
                              rows={4}
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="How can we help?" 
                              className="w-full p-3.5 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface"
                            />
                          </div>
                          
                          <button 
                            type="submit"
                            disabled={submitting}
                            className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                          >
                            {submitting ? "Submitting Inquiry..." : "Submit Inquiry"}
                          </button>
                        </div>
                      )}

                      {/* Form 2: Pilot Program Application */}
                      {formType === "pilot" && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Farmer / Contact Name</label>
                              <input 
                                required
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your full name" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Cooperative or Farm Name</label>
                              <input 
                                type="text" 
                                value={org}
                                onChange={(e) => setOrg(e.target.value)}
                                placeholder="Name of farm/cooperative" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Country</label>
                              <input 
                                required
                                type="text" 
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="Botswana" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">District</label>
                              <input 
                                required
                                type="text" 
                                value={district}
                                onChange={(e) => setDistrict(e.target.value)}
                                placeholder="e.g. Kweneng" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Phone</label>
                              <input 
                                required
                                type="tel" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Phone number" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Organization Type</label>
                              <select 
                                value={orgType}
                                onChange={(e) => setOrgType(e.target.value)}
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface font-medium"
                              >
                                <option>Individual Smallholder Farmer</option>
                                <option>Cooperative / Syndicate</option>
                                <option>Commercial Farm</option>
                                <option>NGO / Development Partner</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Estimated Farmers Reached</label>
                              <input 
                                required
                                type="number" 
                                value={farmersReached}
                                onChange={(e) => setFarmersReached(e.target.value)}
                                placeholder="e.g. 25" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-2">Email Address</label>
                            <input 
                              required
                              type="email" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="email@example.com" 
                              className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-2">Motivation for Participating</label>
                            <textarea 
                              required
                              rows={3}
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Why do you want to join this pilot?" 
                              className="w-full p-3.5 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                            />
                          </div>

                          <button 
                            type="submit"
                            disabled={submitting}
                            className="w-full h-12 bg-secondary text-on-secondary rounded-xl font-bold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center justify-center"
                          >
                            {submitting ? "Applying..." : "Apply for Pilot"}
                          </button>
                        </div>
                      )}

                      {/* Form 3: Support / Sponsor */}
                      {formType === "support" && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Name</label>
                              <input 
                                required
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Organization</label>
                              <input 
                                type="text" 
                                value={org}
                                onChange={(e) => setOrg(e.target.value)}
                                placeholder="Company/Trust name" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Email</label>
                              <input 
                                required
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@example.com" 
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-primary mb-2">Support Type</label>
                              <select 
                                value={supportType}
                                onChange={(e) => setSupportType(e.target.value)}
                                className="w-full h-11 px-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface font-medium"
                              >
                                <option>Financial Support / Grant</option>
                                <option>Technical Partnership</option>
                                <option>Mentorship / Advisory</option>
                                <option>Equipment Donation</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-primary mb-2">Description of Support</label>
                            <textarea 
                              required
                              rows={4}
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Tell us how you'd like to support the mission..." 
                              className="w-full p-3.5 text-xs bg-surface-container-lowest border border-outline-variant rounded-xl"
                            />
                          </div>

                          <button 
                            type="submit"
                            disabled={submitting}
                            className="w-full h-12 bg-primary text-on-primary rounded-xl font-bold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center justify-center"
                          >
                            {submitting ? "Sending..." : "Send Support Message"}
                          </button>
                        </div>
                      )}

                    </form>
                  )}

                </div>
              </section>

            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
            >
              <AdminPanel onAddInquiryNotification={handleAdminNotification} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t border-outline-variant/30 mt-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img 
                  alt="Logo" 
                  className="h-8 w-auto object-contain" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkHlL9c1PCO2Zw3kJhkSI3zhPH672dNLC2tUk9xBBXC2dOOGbLwIK8FoMZteQ48g-HiAjT3tldKyMahu-drW-1CSByYIWQzcq7ARYq3rRwa0RQAzYq_61_I-yDstHA7S_2AAHl8F-NAgq0XRYXfy6UWgfzsHT4L1xAh8dPelXDS3C2FJjK7_tSeoDkstz-St9HvR4_b-lzyWbCOncA_mbHVDP_J7i7nd8KagjaPz0ZsaIqRiDmLvFH4mY5fFR0LtIz8A"
                />
                <span className="font-bold text-md text-primary">Agricool Hubs</span>
              </div>
              <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">
                Building resilient agricultural infrastructure for Africa. Botswana Sustainable Agri-Tech Initiative.
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-all">
                  <span className="text-xs font-bold">In</span>
                </a>
                <a href="#" className="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-all">
                  <Share2 className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Column 2: Navigation Links */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Company</h4>
                <nav className="flex flex-col gap-2">
                  <button onClick={() => { setActiveTab("landing"); setTimeout(() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }), 100); }} className="text-xs text-left text-on-surface-variant hover:text-primary transition-colors">About</button>
                  <button onClick={() => { setActiveTab("landing"); setTimeout(() => document.getElementById("pilot")?.scrollIntoView({ behavior: "smooth" }), 100); }} className="text-xs text-left text-on-surface-variant hover:text-primary transition-colors">Pilot Programme</button>
                  <button onClick={() => { setActiveTab("landing"); setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 100); }} className="text-xs text-left text-on-surface-variant hover:text-primary transition-colors">Contact</button>
                </nav>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Resources</h4>
                <nav className="flex flex-col gap-2">
                  <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</a>
                  <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">Terms of Service</a>
                  <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">Climate Impact</a>
                </nav>
              </div>
            </div>

            {/* Column 3: Contact details */}
            <div className="space-y-4" id="contact">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Contact Us</h4>
              <div className="flex items-center gap-2.5 text-on-surface-variant text-xs">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href="mailto:agricoolhubsproject@gmail.com" className="hover:underline">agricoolhubsproject@gmail.com</a>
              </div>
              <div className="flex items-center gap-2.5 text-on-surface-variant text-xs">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span>Gaborone, Botswana</span>
              </div>
            </div>

          </div>

          {/* Bottom Copyright bar */}
          <div className="mt-12 pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-4 text-on-surface-variant text-xs">
            <p>© 2026 Agricool Hubs. All rights reserved.</p>
            <div className="flex gap-6">
              <span>Botswana Integrated Tech</span>
              <span>SDG 2: Zero Hunger</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
