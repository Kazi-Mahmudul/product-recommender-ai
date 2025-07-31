import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPhoneBySlug, Phone } from "../api/phones";
import { useComparison } from "../context/ComparisonContext";
import HeroSection from "../components/FullSpecs/HeroSection";
import DeviceScoresChart from "../components/FullSpecs/DeviceScoresChart";
import FullSpecsAccordion from "../components/FullSpecs/FullSpecsAccordion";
import ProsCons from "../components/FullSpecs/ProsCons";
import SmartRecommendations from "../components/FullSpecs/SmartRecommendations";
import {
  fetchGeminiSummary,
  fetchGeminiProsCons
} from "../api/gemini";

const PhoneDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // All hooks must be at the top
  const [phone, setPhone] = useState<Phone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagline, setTagline] = useState("");
  const [loadingTagline, setLoadingTagline] = useState(false);
  const [pros, setPros] = useState<string[]>([]);
  const [cons, setCons] = useState<string[]>([]);
  const [loadingProsCons, setLoadingProsCons] = useState(false);
  const [prosConsError, setProsConsError] = useState<string | null>(null);
  
  // Use comparison context
  const { addPhone, removePhone, isPhoneSelected } = useComparison();
  
  // SmartRecommendations component handles its own state

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    
    fetchPhoneBySlug(slug)
      .then((phoneData) => {
        setPhone(phoneData);
        // Once we have the phone data, generate pros and cons automatically
        generateProsCons(phoneData);
      })
      .catch(() => setError("Failed to load phone details."))
      .finally(() => setLoading(false));
  }, [slug]);
  
  // Function to generate pros and cons
  const generateProsCons = async (phoneData: Phone) => {
    setLoadingProsCons(true);
    setProsConsError(null);
    try {
      const result = await fetchGeminiProsCons(phoneData);
      setPros(result.pros || []);
      setCons(result.cons || []);
      setProsConsError(null);
    } catch (e) {
      setPros(["Great camera", "Fast charging", "AMOLED panel"]);
      setCons(["No wireless charging", "Bloatware"]);
      setProsConsError(
        e instanceof Error
          ? e.message || "Failed to generate pros and cons."
          : "Failed to generate pros and cons."
      );
    }
    setLoadingProsCons(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-brand text-lg animate-pulse">Loading phone specs...</div>
      </div>
    );
  }
  if (error || !phone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-lg">{error || "Phone not found."}</div>
      </div>
    );
  }


  // Handlers for AI sections
  const handleAISummary = async () => {
    setLoadingTagline(true);
    try {
      const prompt = `Generate a concise, compelling 1-2 sentence tagline for this smartphone that highlights its key selling points and target audience. Focus on the most impressive specifications and value proposition.

Phone Specifications:
- Name: ${phone.name}
- Brand: ${phone.brand}
- Price: ${phone.price_original ? `BDT ${phone.price_original}` : `BDT ${phone.price}`}
- RAM: ${phone.ram_gb ? `${phone.ram_gb}GB` : phone.ram || 'N/A'}
- Storage: ${phone.storage_gb ? `${phone.storage_gb}GB` : phone.internal_storage || 'N/A'}
- Display: ${phone.screen_size_numeric ? `${phone.screen_size_numeric}"` : ''} ${phone.display_resolution || ''} ${phone.refresh_rate_numeric ? `${phone.refresh_rate_numeric}Hz` : ''}
- Camera: ${phone.primary_camera_mp ? `${phone.primary_camera_mp}MP main` : ''} ${phone.selfie_camera_mp ? `+ ${phone.selfie_camera_mp}MP selfie` : ''}
- Battery: ${phone.battery_capacity_numeric ? `${phone.battery_capacity_numeric}mAh` : phone.capacity || 'N/A'}
- Chipset: ${phone.chipset || 'N/A'}
- Performance Score: ${phone.performance_score ? `${phone.performance_score}/10` : 'N/A'}
- Camera Score: ${phone.camera_score ? `${phone.camera_score}/10` : 'N/A'}
- Overall Score: ${phone.overall_device_score ? `${phone.overall_device_score}/10` : 'N/A'}

Examples of good taglines:
- "Flagship performance meets affordable pricing with 108MP cameras and 120Hz display"
- "Gaming powerhouse with Snapdragon 8 Gen 2 and 5000mAh battery for all-day performance"
- "Premium photography experience with 50MP triple cameras and AI-enhanced features"

Generate a similar tagline that captures this phone's unique strengths:`;

      const summary = await fetchGeminiSummary(prompt);
      setTagline(summary);
    } catch {
      setTagline("Couldn't generate summary.");
    }
    setLoadingTagline(false);
  };

  const handleProsCons = async () => {
    setLoadingProsCons(true);
    setProsConsError(null);
    try {
      const result = await fetchGeminiProsCons(phone);
      setPros(result.pros || []);
      setCons(result.cons || []);
      setProsConsError(null);
    } catch (e) {
      setPros(["Great camera", "Fast charging", "AMOLED panel"]);
      setCons(["No wireless charging", "Bloatware"]);
      setProsConsError(
        e instanceof Error
          ? e.message || "Failed to generate pros and cons."
          : "Failed to generate pros and cons."
      );
    }
    setLoadingProsCons(false);
  };

  // SmartRecommendations component handles its own data fetching and state management

  // Compare button handler
  const handleAddToCompare = () => {
    if (phone) {
      if (isPhoneSelected(phone.slug!)) {
        removePhone(phone.slug!);
      } else {
        addPhone(phone);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/10 via-white to-brand/5 dark:from-brand/20 dark:via-gray-900 dark:to-brand/10 pt-20 pb-8 px-2 sm:px-4 max-w-4xl mx-auto">
      {/* 1. HERO SECTION */}
      <div className="mb-6">
        <HeroSection
          phone={phone}
          onAISummary={handleAISummary}
          onAddToCompare={handleAddToCompare}
          tagline={tagline}
          loadingTagline={loadingTagline}
        />
      </div>

      {/* 4. FULL SPECIFICATIONS SECTION */}
      <div className="mb-6">
        <FullSpecsAccordion phone={phone} />
      </div>

      {/* 5. DEVICE SCORES SECTION (now under accordion, with standard gap) */}
      <div className="mb-8">
        <DeviceScoresChart phone={phone} />
      </div>

      {/* 6. PROS AND CONS SECTION */}
      <div className="mb-6">
        <ProsCons
          pros={pros}
          cons={cons}
          loading={loadingProsCons}
          error={prosConsError || undefined}
          onGenerate={handleProsCons}
        />
      </div>

      {/* 7. SMART RECOMMENDATIONS SECTION */}
      <div className="mb-6">
        {phone && <SmartRecommendations phoneSlug={phone.slug!} />}
      </div>
    </div>
  );
};

export default PhoneDetailsPage;