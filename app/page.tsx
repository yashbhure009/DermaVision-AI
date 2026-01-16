"use client"

import type React from "react"
import { useState, useRef } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Upload,
  X,
  ChevronDown,
  BarChart3,
  Stethoscope, // Changed icon for "Doctor" feel
  FileText
} from "lucide-react"
import { type Language, translations } from "@/lib/translations"
import { LanguageSelector } from "@/components/language-selector"
import { PieChart } from "@/components/pie-chart"
import { OverallRiskChart } from "@/components/overall-risk-chart"
import { SplashScreen } from "@/components/splash-screen"
import Image from "next/image"
import { InformationPage } from "@/components/information-page"
import { AboutPage } from "@/components/about-page"
import SkinScanner from "@/components/SkinScanner"
import * as tmImage from '@teachablemachine/image';
import '@tensorflow/tfjs';

type Screen = "landing" | "scan" | "triage" | "results" | "information" | "about"

interface ScanSession {
  ai_malignant_prob: number
  symptoms: string[]
  final_risk_score: number
  image_url: string | null
  description: string
  tier1: { cancer: number; inflammatory: number; fungal: number; normal: number }
  tier2: {
    melanoma: number; bcc: number; eczema: number; atopicDermatitis: number;
    melanocyticNevi: number; bkl: number; psoriasis: number; seborrheicKeratoses: number;
    tinea: number; warts: number; normal: number
  }
  aiRecommendations: string[]
  geminiReport?: string 
}

export default function DermaVisionApp() {
  const [language, setLanguage] = useState<Language>("en")
  const [currentScreen, setCurrentScreen] = useState<Screen>("landing")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeminiLoading, setIsGeminiLoading] = useState(false)

  // INITIAL STATE
  const [scanSession, setScanSession] = useState<ScanSession>({
    ai_malignant_prob: 0,
    symptoms: [],
    final_risk_score: 0,
    image_url: null,
    description: "",
    tier1: { cancer: 0, inflammatory: 0, fungal: 0, normal: 0 },
    tier2: { melanoma: 0, bcc: 0, eczema: 0, atopicDermatitis: 0, melanocyticNevi: 0, bkl: 0, psoriasis: 0, seborrheicKeratoses: 0, tinea: 0, warts: 0, normal: 0 },
    aiRecommendations: []
  })
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showDetailedCharts, setShowDetailedCharts] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const t = translations[language]

  const navigateToScreen = (screen: Screen) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentScreen(screen)
      setIsTransitioning(false)
    }, 300)
  }

  // --- 1. LOCAL ANALYSIS (Teachable Machine) ---
  const performAnalysis = async (imageSrc: string) => {
    setIsAnalyzing(true);
    setCapturedImage(imageSrc);

    try {
        const modelURL = "/model/model.json";
        const metadataURL = "/model/metadata.json";
        const model = await tmImage.load(modelURL, metadataURL);
        
        const imgElement = document.createElement("img");
        imgElement.src = imageSrc;
        await new Promise((resolve) => { imgElement.onload = resolve; });

        const predictions = await model.predict(imgElement);
        
        const p = (name: string) => {
            const pred = predictions.find(item => item.className.toLowerCase().includes(name.toLowerCase()));
            return pred ? pred.probability : 0;
        };

        // Extraction based on your dataset folder names
        const probMelanoma = p("Melanoma") + p("Skin Cancer");
        const probBCC = p("Basal Cell");
        const probEczema = p("Eczema");
        const probDermatitis = p("Atopic");
        const probNevi = p("Nevi");
        const probBKL = p("Benign Keratosis");
        const probPsoriasis = p("Psoriasis");
        const probSeborrheic = p("Seborrehic");
        const probTinea = p("Tinea");
        const probWarts = p("Warts");
        const probNormal = p("Normal");

        const malignantSum = probMelanoma + probBCC;
        const inflammatorySum = probEczema + probDermatitis + probPsoriasis;
        const fungalSum = probTinea + probWarts;
        const benignSum = probNormal + probNevi + probBKL + probSeborrheic;

        const total = malignantSum + inflammatorySum + fungalSum + benignSum;
        const norm = total > 0 ? total : 1;

        const tier1 = {
            cancer: malignantSum / norm,
            inflammatory: inflammatorySum / norm,
            fungal: fungalSum / norm,
            normal: benignSum / norm
        };

        const topCondition = predictions.sort((a, b) => b.probability - a.probability)[0];
        
        const recommendations: string[] = [];
        if (malignantSum > 0.4) {
            recommendations.push("High risk pattern detected.");
            recommendations.push("Immediate consultation advised.");
        } else if (inflammatorySum > 0.4) {
            recommendations.push("Likely inflammatory condition.");
            recommendations.push("Monitor triggers.");
        } else {
            recommendations.push("Appears benign.");
            recommendations.push("Routine monitoring recommended.");
        }

        setScanSession(prev => ({
            ...prev,
            image_url: imageSrc,
            ai_malignant_prob: malignantSum, 
            description: `Visual Match: ${topCondition.className} (${(topCondition.probability * 100).toFixed(0)}%)`,
            tier1: tier1,
            tier2: {
                melanoma: probMelanoma, bcc: probBCC, eczema: probEczema, atopicDermatitis: probDermatitis,
                melanocyticNevi: probNevi, bkl: probBKL, psoriasis: probPsoriasis, seborrheicKeratoses: probSeborrheic,
                tinea: probTinea, warts: probWarts, normal: probNormal
            },
            aiRecommendations: recommendations
        }));

        navigateToScreen("triage");

    } catch (error) {
        console.error("AI Error:", error);
        alert("Error loading local model.");
    } finally {
        setIsAnalyzing(false);
    }
  }

  // --- 2. DERMAVISION DOCTOR (Gemini API) ---
  // --- 2. DERMAVISION DOCTOR (Gemini API) ---
  const generateGeminiReport = async () => {
    if (!capturedImage) return;
    setIsGeminiLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          symptoms: scanSession.symptoms,
          classification: scanSession.description
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Show the ACTUAL server error in the alert
        throw new Error(data.error || `Server Error: ${response.status}`);
      }

      if (data.result) {
        setScanSession(prev => ({ ...prev, geminiReport: data.result }));
      }
    } catch (error: any) {
      console.error("Gemini Error", error);
      // ✅ FIX: Alert shows the exact error message now
      alert(`DermaVision Doctor Error: ${error.message}`);
    } finally {
      setIsGeminiLoading(false);
    }
  }

  const handleWebcamCapture = (imageSrc: string) => performAnalysis(imageSrc);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const result = event.target?.result as string
        performAnalysis(result);
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleSymptom = (symptom: string) => {
    setScanSession((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }))
  }

  const calculateRiskScore = () => {
    const { ai_malignant_prob, tier1, symptoms } = scanSession
    let finalScore = ai_malignant_prob;
    
    if (tier1.inflammatory > 0.5 || tier1.fungal > 0.5) finalScore += 0.15;
    if (symptoms.includes("bleed_check")) finalScore += 0.20;
    if (symptoms.includes("growth_check")) finalScore += 0.15;
    if (symptoms.includes("itch_check")) finalScore += 0.05;

    finalScore = Math.min(0.99, finalScore);
    if (symptoms.length > 0 && finalScore < 0.2) finalScore = 0.20;

    setScanSession((prev) => ({ ...prev, final_risk_score: finalScore }));
    navigateToScreen("results");
  }

  const getRiskDetails = () => {
    const { final_risk_score } = scanSession
    if (final_risk_score >= 0.70) return { level: "Critical", bgColor: "bg-red-50", borderColor: "border-red-500", textColor: "text-black", iconColor: "text-red-600", message: "Urgent attention needed.", icon: AlertTriangle }
    if (final_risk_score >= 0.40) return { level: "High Risk", bgColor: "bg-orange-50", borderColor: "border-orange-500", textColor: "text-black", iconColor: "text-orange-600", message: "Consult a doctor soon.", icon: AlertTriangle }
    if (final_risk_score >= 0.20) return { level: "Moderate", bgColor: "bg-amber-50", borderColor: "border-amber-500", textColor: "text-black", iconColor: "text-amber-600", message: "Monitor closely.", icon: Activity }
    return { level: "Low Risk", bgColor: "bg-sky-50", borderColor: "border-sky-500", textColor: "text-black", iconColor: "text-sky-600", message: "Likely benign.", icon: CheckCircle }
  }

  const resetSession = () => {
    setScanSession({ ai_malignant_prob: 0, symptoms: [], final_risk_score: 0, image_url: null, description: "", tier1: { cancer: 0, inflammatory: 0, fungal: 0, normal: 0 }, tier2: { melanoma: 0, bcc: 0, eczema: 0, atopicDermatitis: 0, melanocyticNevi: 0, bkl: 0, psoriasis: 0, seborrheicKeratoses: 0, tinea: 0, warts: 0, normal: 0 }, aiRecommendations: [] })
    setCapturedImage(null)
    setIsAnalyzing(false)
    setIsGeminiLoading(false)
    navigateToScreen("landing")
  }

  // --- UI COMPONENTS ---
  const LandingPage = () => (
    <div className="min-h-screen bg-derma-white flex flex-col relative">
      <div className="absolute inset-0 z-0 opacity-30 bg-[url('/images/hospital-bg.png')] bg-cover bg-center" />
      <header className="p-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <Image src="/images/dermavision-logo.png" alt="Logo" width={48} height={48} className="rounded-xl shadow-md" />
          <span className="text-2xl font-bold text-derma-teal-dark">DermaVision AI</span>
        </div>
        <LanguageSelector currentLanguage={language} onLanguageChange={setLanguage} compact />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20 relative z-10">
        <div className="max-w-md w-full space-y-8 text-center">
          <h2 className="text-4xl font-extrabold text-black">{t.heroTitle}</h2>
          <p className="text-lg text-gray-700">{t.heroSubtitle}</p>
          <button onClick={() => navigateToScreen("scan")} className="btn-primary w-full bg-derma-teal-dark text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2">
            {t.startScan} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  )

  const ScanPage = () => (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="p-4 flex items-center justify-between bg-black/30 backdrop-blur-sm z-50">
        <button onClick={() => navigateToScreen("landing")} className="text-white p-2"><X className="w-6 h-6" /></button>
        <h2 className="text-white font-bold">{t.captureLesion}</h2>
      </header>
      <div className="flex-1 relative flex flex-col items-center justify-center p-4">
          <SkinScanner onCapture={handleWebcamCapture} />
          <div className="my-6 w-full max-w-md flex items-center gap-2 text-gray-500 text-sm">
             <div className="h-px bg-gray-700 flex-1" /> OR <div className="h-px bg-gray-700 flex-1" />
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing} className="btn-secondary w-full max-w-md bg-gray-800 text-white py-4 rounded-xl font-bold text-lg border border-gray-700 shadow-lg flex items-center justify-center gap-2">
            {isAnalyzing ? <Activity className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {isAnalyzing ? "Analyzing..." : t.uploadGallery}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      </div>
    </div>
  )

  const TriagePage = () => (
    <div className="min-h-screen bg-derma-yellow/20 flex flex-col">
      <header className="p-6 bg-derma-white shadow-sm border-b border-derma-cream">
        <h2 className="text-2xl font-bold text-black">{t.symptomAssessment}</h2>
      </header>
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="bg-derma-teal/10 border border-derma-teal/30 rounded-xl p-4">
          <div className="flex gap-3">
            <Activity className="w-6 h-6 text-derma-teal flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="font-bold text-black">{t.aiAnalysisComplete}</p>
              <p className="text-sm text-gray-700 mt-1">{scanSession.description}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-black">{t.clinicalSymptoms}</h3>
          {[
             {id: "itch_check", label: t.itching, desc: t.itchingDesc},
             {id: "bleed_check", label: t.bleeding, desc: t.bleedingDesc, color: "text-red-500"},
             {id: "growth_check", label: t.rapidGrowth, desc: t.rapidGrowthDesc, color: "text-orange-500"}
          ].map(sym => (
             <label key={sym.id} className="flex items-center gap-4 p-5 bg-white rounded-xl border-2 cursor-pointer hover:border-derma-teal transition-all">
                <input type="checkbox" checked={scanSession.symptoms.includes(sym.id)} onChange={() => toggleSymptom(sym.id)} className={`w-6 h-6 ${sym.color || "text-derma-teal"}`} />
                <div className="flex-1"><p className="font-bold text-black">{sym.label}</p><p className="text-sm text-gray-600">{sym.desc}</p></div>
             </label>
          ))}
        </div>
      </main>
      <div className="p-6 bg-white border-t">
        <button onClick={calculateRiskScore} className="btn-primary w-full bg-derma-teal-dark text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2">
          {t.generateReport} <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  const ResultsPage = () => {
    const riskDetails = getRiskDetails()
    const RiskIcon = riskDetails.icon
    
    // Data formatting for charts
    const tier1Data = [
      { label: "Malignant", value: scanSession.tier1.cancer * 100, color: "#EF4444" },
      { label: "Inflammatory", value: scanSession.tier1.inflammatory * 100, color: "#F59E0B" },
      { label: "Fungal/Viral", value: scanSession.tier1.fungal * 100, color: "#8B5CF6" },
      { label: "Benign", value: scanSession.tier1.normal * 100, color: "#10B981" },
    ].filter(d => d.value > 0);

    const tier2Labels: Record<string, string> = { melanoma: "Melanoma", bcc: "Basal Cell", eczema: "Eczema", atopicDermatitis: "Dermatitis", melanocyticNevi: "Nevi (Mole)", bkl: "Keratosis", psoriasis: "Psoriasis", seborrheicKeratoses: "Seborrheic K.", tinea: "Tinea", warts: "Warts", normal: "Normal Skin" }
    
    const tier2Data = Object.entries(scanSession.tier2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key, value], index) => ({
        label: tier2Labels[key] || key,
        value: value * 100,
        color: ["#EF9A9A", "#FFCC80", "#90CAF9", "#A5D6A7", "#CE93D8"][index] || "#ccc",
      }))

    return (
      <div className="min-h-screen bg-derma-cream/30 flex flex-col">
        <header className="p-6 bg-white shadow-sm border-b border-derma-cream"><h2 className="text-2xl font-bold text-black">{t.riskAssessment}</h2></header>
        <main className="flex-1 p-6 space-y-6 overflow-y-auto pb-32">
          {/* Risk Gauge */}
          <div className={`${riskDetails.bgColor} border-2 ${riskDetails.borderColor} rounded-2xl p-6 shadow-lg`}>
            <div className="flex flex-col items-center">
              <OverallRiskChart riskScore={scanSession.final_risk_score} labels={{ riskLevel: "Risk Score", safe: "Safe" }} riskColor={scanSession.final_risk_score > 0.5 ? '#dc2626' : '#10b981'} />
              <div className="mt-4 flex items-center gap-2"><RiskIcon className={`w-6 h-6 ${riskDetails.iconColor}`} /><span className={`font-bold ${riskDetails.textColor}`}>{riskDetails.level}</span></div>
              <p className="text-gray-700 font-medium text-center mt-4">{riskDetails.message}</p>
            </div>
          </div>

          {/* DermaVision Doctor Section - RENAMED */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 shadow-md border border-indigo-100">
             <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="w-6 h-6 text-indigo-600" />
                <h3 className="text-xl font-bold text-indigo-900">DermaVision Doctor</h3>
             </div>
             
             {!scanSession.geminiReport ? (
                <div className="text-center py-4">
                   <p className="text-gray-600 mb-4 text-sm">Get a detailed analysis combining your photo + symptoms.</p>
                   <button 
                     onClick={generateGeminiReport}
                     disabled={isGeminiLoading}
                     className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 w-full active:scale-95 transition-all"
                   >
                      {isGeminiLoading ? <Activity className="animate-spin w-5 h-5"/> : <FileText className="w-5 h-5"/>}
                      {isGeminiLoading ? "Analyzing..." : "Ask DermaVision Doctor"}
                   </button>
                </div>
             ) : (
                <div className="prose prose-sm max-w-none text-gray-800 bg-white/60 p-4 rounded-xl">
                   <div className="whitespace-pre-wrap font-medium">{scanSession.geminiReport}</div>
                </div>
             )}
          </div>

          {/* Detailed Charts */}
          <button onClick={() => setShowDetailedCharts(!showDetailedCharts)} className="w-full flex items-center justify-between p-4 bg-white rounded-xl border shadow-sm">
              <span className="font-bold text-black flex gap-2"><BarChart3 className="w-5 h-5"/> Detailed Analysis</span><ChevronDown />
          </button>
          
          {showDetailedCharts && (
              <div className="space-y-6 animate-fade-in-up">
                 <div className="bg-white rounded-xl p-5 border shadow-sm">
                    <h3 className="font-bold text-black mb-4">Category Breakdown</h3>
                    <PieChart data={tier1Data} title="" />
                 </div>
                 <div className="bg-white rounded-xl p-5 border shadow-sm">
                    <h3 className="font-bold text-black mb-4">Top Matches</h3>
                    <PieChart data={tier2Data} />
                 </div>
              </div>
          )}
        </main>
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t"><button onClick={resetSession} className="btn-primary w-full bg-derma-teal-dark text-white py-4 rounded-xl font-bold">{t.newScan}</button></div>
      </div>
    )
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "landing": return <LandingPage />
      case "scan": return <ScanPage />
      case "triage": return <TriagePage />
      case "results": return <ResultsPage />
      case "information": return <InformationPage onBack={() => navigateToScreen("landing")} />
      case "about": return <AboutPage onBack={() => navigateToScreen("landing")} />
      default: return <LandingPage />
    }
  }

  return <SplashScreen><div className={`transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>{renderScreen()}</div></SplashScreen>
}