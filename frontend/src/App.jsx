import { useState, useCallback, useRef, useEffect } from "react";

// ── Groq API helper ───────────────────────────────────────────────────────────

async function callAI(prompt, maxTokens = 600) {
  console.log("🌐 callAI function called with maxTokens:", maxTokens);
  
  try {
    // Call YOUR backend API instead of Groq directly
    // Your API key is safely hidden on your server!
    const res = await fetch("/api/groq", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        maxTokens: maxTokens,
      }),
    });

    console.log("📡 Backend Response Status:", res.status, res.statusText);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorMsg = err?.error || `API error ${res.status}`;
      console.error("❌ Backend Error:", err);
      throw new Error(`❌ API Error: ${errorMsg}`);
    }

    const data = await res.json();
    console.log("✅ Response received successfully");
    return data.content;
  } catch (error) {
    console.error("❌ Error calling backend:", error);
    throw error;
  }
}

// ── Text Extraction Functions ───────────────────────────────────────────────────

// Extract text from PDF files
async function extractTextFromPDF(file) {
  console.log("📄 Starting PDF extraction...");
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = async () => {
      try {
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        
        const reader = new FileReader();
        reader.onload = async (e) => {
          const pdf = await pdfjsLib.getDocument(new Uint8Array(e.target.result)).promise;
          let text = "";
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(" ") + "\n";
          }
          
          console.log("✅ PDF text extracted, length:", text.length);
          resolve(text);
        };
        reader.onerror = () => reject(new Error("Error reading PDF file"));
        reader.readAsArrayBuffer(file);
      } catch (err) {
        console.error("❌ PDF extraction error:", err);
        reject(err);
      }
    };
    script.onerror = () => reject(new Error("Failed to load PDF library"));
    document.head.appendChild(script);
  });
}

// Extract text from images using OCR
async function extractTextFromImage(file) {
  console.log("🖼️ Starting OCR extraction from image...");
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js";
    script.onload = async () => {
      try {
        const Tesseract = window.Tesseract;
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            console.log("📍 Running OCR on image...");
            const result = await Tesseract.recognize(e.target.result, "eng");
            const text = result.data.text;
            console.log("✅ OCR extraction complete, length:", text.length);
            resolve(text);
          } catch (err) {
            console.error("❌ OCR error:", err);
            reject(new Error("OCR failed: " + err.message));
          }
        };
        reader.onerror = () => reject(new Error("Error reading image file"));
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("❌ Image extraction error:", err);
        reject(err);
      }
    };
    script.onerror = () => reject(new Error("Failed to load OCR library"));
    document.head.appendChild(script);
  });
}

// Extract text from Word documents (.docx)
async function extractTextFromWord(file) {
  console.log("📘 Starting Word document extraction...");
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
    script.onload = async () => {
      try {
        const mammoth = window.mammoth;
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            console.log("📍 Parsing Word document...");
            const result = await mammoth.extractRawText({ arrayBuffer: e.target.result });
            const text = result.value;
            console.log("✅ Word extraction complete, length:", text.length);
            resolve(text);
          } catch (err) {
            console.error("❌ Word extraction error:", err);
            reject(new Error("Word extraction failed: " + err.message));
          }
        };
        reader.onerror = () => reject(new Error("Error reading Word file"));
        reader.readAsArrayBuffer(file);
      } catch (err) {
        console.error("❌ Document extraction error:", err);
        reject(err);
      }
    };
    script.onerror = () => reject(new Error("Failed to load Word library"));
    document.head.appendChild(script);
  });
}

// Main function to extract text based on file type
async function extractTextFromFile(file, onProgress) {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  console.log("🔍 Detecting file type:", fileType, "name:", fileName);
  
  try {
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      onProgress("Extracting text from PDF...");
      return await extractTextFromPDF(file);
    } else if (fileType.startsWith("image/")) {
      onProgress("Running OCR on image (this may take 10-30 seconds)...");
      return await extractTextFromImage(file);
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith(".docx")) {
      onProgress("Extracting text from Word document...");
      return await extractTextFromWord(file);
    } else if (fileType === "text/plain" || fileName.endsWith(".txt")) {
      onProgress("Reading text file...");
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target.result;
          console.log("✅ Text file read, length:", text.length);
          resolve(text);
        };
        reader.onerror = () => reject(new Error("Error reading text file"));
        reader.readAsText(file);
      });
    } else {
      throw new Error(`Unsupported file format: ${fileType || fileName}`);
    }
  } catch (error) {
    console.error("❌ Text extraction failed:", error);
    throw error;
  }
}

const esc = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function uid() {
  return Date.now() + Math.random();
}

// ── Palette ───────────────────────────────────────────────────────────────────
// #0b090a · #161a1d · #660708 · #a4161a · #ba181b · #e5383b · #b1a7a6 · #d3d3d3 · #f5f3f4 · #ffffff
const P = {
  black:     "#0b090a",
  darkSurf:  "#161a1d",
  deepRed:   "#660708",
  midRed:    "#a4161a",
  red:       "#ba181b",
  brightRed: "#e5383b",
  warmGray:  "#b1a7a6",
  lightGray: "#d3d3d3",
  offWhite:  "#f5f3f4",
  white:     "#ffffff",
};

function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: t.type === "error" ? P.deepRed : t.type === "info" ? P.darkSurf : P.red,
          color: P.white, padding: "12px 18px", borderRadius: 8, fontSize: 13,
          fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.5)",
          animation: "slideUp .3s ease-out", maxWidth: 320,
        }}>{t.msg}</div>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 20, height: 20, border: `2px solid rgba(255,255,255,.3)`,
      borderTopColor: P.white, borderRadius: "50%",
      animation: "spin .7s linear infinite", display: "inline-block",
    }} />
  );
}

const SECTIONS = [
  { id: "personal",       icon: "👤", label: "Personal Info" },
  { id: "summary",        icon: "📝", label: "Summary" },
  { id: "experience",     icon: "💼", label: "Experience" },
  { id: "education",      icon: "🎓", label: "Education" },
  { id: "skills",         icon: "⚡", label: "Skills" },
  { id: "projects",       icon: "🚀", label: "Projects" },
  { id: "certifications", icon: "🏆", label: "Certifications" },
  { id: "atscheck",        icon: "🎯", label: "ATS Checker" },
  { id: "certanalyzer",    icon: "📸", label: "Upload Certificate" },
];

const EMPTY_RESUME = {
  personal: { firstName:"", lastName:"", title:"", email:"", phone:"", location:"", linkedin:"", website:"" },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};

const TEMPLATE = {
  personal: { firstName:"Sarah", lastName:"Anderson", title:"Senior Product Manager", email:"sarah@email.com", phone:"+1 (555) 123-4567", location:"San Francisco, CA", linkedin:"linkedin.com/in/sarahanders", website:"sarahanders.com" },
  summary: "Innovative Product Manager with 8+ years building SaaS products. Proven track record of increasing user engagement by 300% and generating $5M+ in revenue. Data-driven leader passionate about solving complex user problems.",
  experience: [
    { id:1, company:"TechCorp Inc", role:"Senior Product Manager", location:"San Francisco, CA", startDate:"Mar 2021", endDate:"", current:true, description:"• Led cross-functional team of 12 to launch 3 major features\n• Grew MAU from 100K to 500K\n• Managed $2M+ budget with 95% ROI" },
    { id:2, company:"StartupXYZ", role:"Product Manager", location:"San Francisco, CA", startDate:"Jun 2019", endDate:"Feb 2021", current:false, description:"• Owned full product roadmap\n• Grew subscribers 250%, 4.8 App Store rating\n• Improved conversion rate 40% via analytics" },
  ],
  education: [{ id:3, school:"UC Berkeley", degree:"B.S.", field:"Computer Science", gradYear:"2016" }],
  skills: ["Product Management","Strategic Planning","User Research","Data Analytics","Agile/Scrum","Figma","SQL","Python","Market Analysis","Team Leadership"],
  projects: [{ id:4, name:"Analytics Dashboard", description:"Real-time analytics platform for business metrics.", technologies:"React, Node.js, PostgreSQL, D3.js", link:"github.com/sarahanders/analytics-dashboard" }],
  certifications: [{ id:5, name:"Certified Product Manager", issuer:"Product School", date:"Jan 2022", credentialId:"PS-123456", link:"" }],
};

// ── Resume Templates ──────────────────────────────────────────────────────────
const RESUME_TEMPLATES = [
  {
    id: "classic",
    name: "Classic Red",
    desc: "Bold red accents, serif fonts",
    accent: P.red,
    preview: { bg: P.white, header: P.red, text: P.black, tag: "#fde8e8", tagText: P.midRed },
  },
  {
    id: "midnight",
    name: "Midnight Blue",
    desc: "Navy professional, corporate feel",
    accent: "#1e3a5f",
    preview: { bg: P.white, header: "#1e3a5f", text: P.black, tag: "#dbeafe", tagText: "#1e3a5f" },
  },
  {
    id: "forest",
    name: "Forest Green",
    desc: "Clean and modern, nature-inspired",
    accent: "#166534",
    preview: { bg: P.white, header: "#166534", text: P.black, tag: "#dcfce7", tagText: "#166534" },
  },
  {
    id: "minimal",
    name: "Minimal Black",
    desc: "Ultra clean, no color distractions",
    accent: P.black,
    preview: { bg: P.white, header: P.black, text: P.black, tag: "#f3f4f6", tagText: P.black },
  },
  {
    id: "purple",
    name: "Royal Purple",
    desc: "Creative & bold, stand out",
    accent: "#6b21a8",
    preview: { bg: P.white, header: "#6b21a8", text: P.black, tag: "#f3e8ff", tagText: "#6b21a8" },
  },
  {
    id: "slate",
    name: "Slate Modern",
    desc: "Two-column layout, contemporary",
    accent: "#334155",
    preview: { bg: P.white, header: "#334155", text: P.black, tag: "#f1f5f9", tagText: "#334155" },
  },
  {
    id: "executive",
    name: "Executive",
    desc: "Dark header banner, premium look",
    accent: "#1a1a2e",
    preview: { bg: P.white, header: "#1a1a2e", text: P.black, tag: "#e8eaf6", tagText: "#1a1a2e" },
  },
  {
    id: "sunset",
    name: "Sunset",
    desc: "Warm orange gradient, energetic",
    accent: "#c2410c",
    preview: { bg: P.white, header: "#c2410c", text: P.black, tag: "#fff7ed", tagText: "#c2410c" },
  },
  {
    id: "elegant",
    name: "Elegant",
    desc: "Right sidebar, gold accents",
    accent: "#92400e",
    preview: { bg: P.white, header: "#92400e", text: P.black, tag: "#fef3c7", tagText: "#92400e" },
  },
  {
    id: "teal",
    name: "Teal Creative",
    desc: "Top banner, modern & fresh",
    accent: "#0f766e",
    preview: { bg: P.white, header: "#0f766e", text: P.black, tag: "#ccfbf1", tagText: "#0f766e" },
  },
];

export default function ResumeAI() {
  const [resume, setResume] = useState(EMPTY_RESUME);
  const [section, setSection] = useState("personal");
  const [dark, setDark] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState({});
  const [exportOpen, setExportOpen] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [activeTemplate, setActiveTemplate] = useState("classic");
  const [templateOpen, setTemplateOpen] = useState(false);

  // ATS Checker state
  const [atsJD, setAtsJD] = useState("");
  const [atsResult, setAtsResult] = useState(null);
  const [atsTab, setAtsTab] = useState("overview");
  const [atsBullet, setAtsBullet] = useState("");

  // Certificate Analyzer state
  const [certFile, setCertFile] = useState(null);
  const [certPreview, setCertPreview] = useState(null);
  const [certAnalysis, setCertAnalysis] = useState(null);
  const [certSelected, setCertSelected] = useState({});
  const [certContent, setCertContent] = useState("");
  const [visitorCount, setVisitorCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(() => window.innerWidth < 1100);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth < 1100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Visitor Tracking ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('https://api.counterapi.dev/v1/resume-banao-job-pao/visits/up')
      .then(response => response.json())
      .then(data => {
        setVisitorCount(data.count ?? data.value ?? 0);
      })
      .catch(err => console.log('Visit tracking error:', err));
  }, []);

  const currentTemplate = RESUME_TEMPLATES.find(t => t.id === activeTemplate) || RESUME_TEMPLATES[0];
  const accent = currentTemplate.accent;

  const setLoad = (key, val) => setLoading(l => ({ ...l, [key]: val }));

  const toast = (msg, type = "success") => {
    const id = uid();
    setToasts(ts => [...ts, { id, msg, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500);
  };

  const upd = (patch) => setResume(r => ({ ...r, ...patch }));
  const updPersonal = (k, v) => setResume(r => ({ ...r, personal: { ...r.personal, [k]: v } }));

  const addExp = () => upd({ experience: [...resume.experience, { id: uid(), company:"", role:"", location:"", startDate:"", endDate:"", current:false, description:"" }] });
  const delExp = (id) => upd({ experience: resume.experience.filter(e => e.id !== id) });
  const updExp = (id, k, v) => upd({ experience: resume.experience.map(e => e.id === id ? { ...e, [k]: v } : e) });

  const addEdu = () => upd({ education: [...resume.education, { id: uid(), school:"", degree:"", field:"", gradYear:"" }] });
  const delEdu = (id) => upd({ education: resume.education.filter(e => e.id !== id) });
  const updEdu = (id, k, v) => upd({ education: resume.education.map(e => e.id === id ? { ...e, [k]: v } : e) });

  const addProj = () => upd({ projects: [...resume.projects, { id: uid(), name:"", description:"", technologies:"", link:"" }] });
  const delProj = (id) => upd({ projects: resume.projects.filter(p => p.id !== id) });
  const updProj = (id, k, v) => upd({ projects: resume.projects.map(p => p.id === id ? { ...p, [k]: v } : p) });

  const addCert = () => upd({ certifications: [...resume.certifications, { id: uid(), name:"", issuer:"", date:"", credentialId:"", link:"" }] });
  const delCert = (id) => upd({ certifications: resume.certifications.filter(c => c.id !== id) });
  const updCert = (id, k, v) => upd({ certifications: resume.certifications.map(c => c.id === id ? { ...c, [k]: v } : c) });

  const addSkill = () => {
    const parts = skillInput.split(",").map(s => s.trim()).filter(Boolean);
    upd({ skills: [...new Set([...resume.skills, ...parts])] });
    setSkillInput("");
  };
  const delSkill = (s) => upd({ skills: resume.skills.filter(x => x !== s) });

  const aiSummary = async () => {
    setLoad("summary", true);
    try {
      const text = await callAI(`Write a compelling 2–3 sentence professional resume summary for:
Title: ${resume.personal.title || "Professional"}
Skills: ${resume.skills.join(", ") || "various skills"}
Roles: ${resume.experience.map(e => e.role + " at " + e.company).join(", ") || "various roles"}
Return ONLY the summary text. No quotes, no preamble.`, 300);
      upd({ summary: text });
      toast("Summary written!");
    } catch (e) { toast(e.message, "error"); }
    setLoad("summary", false);
  };

  const aiSkills = async () => {
    setLoad("skills", true);
    try {
      const text = await callAI(`Suggest 12 relevant professional skills for:
Title: ${resume.personal.title || "Professional"}
Roles: ${resume.experience.map(e => e.role).join(", ") || "various roles"}
Return ONLY a comma-separated list. No numbering or explanation.`, 200);
      const newSkills = text.split(",").map(s => s.trim()).filter(Boolean);
      upd({ skills: [...new Set([...resume.skills, ...newSkills])] });
      toast(`Added ${newSkills.length} skills!`);
    } catch (e) { toast(e.message, "error"); }
    setLoad("skills", false);
  };

  const aiFullResume = async () => {
    setLoad("full", true);
    try {
      const text = await callAI(`Generate a realistic, detailed resume JSON for a senior full-stack engineer. Use this exact structure:
{"personal":{"firstName":"","lastName":"","title":"","email":"","phone":"","location":"","linkedin":"","website":""},"summary":"","experience":[{"id":1,"company":"","role":"","location":"","startDate":"","endDate":"","current":false,"description":""}],"education":[{"id":2,"school":"","degree":"","field":"","gradYear":""}],"skills":[],"projects":[{"id":3,"name":"","description":"","technologies":"","link":""}],"certifications":[{"id":4,"name":"","issuer":"","date":"","credentialId":"","link":""}]}
Make it realistic with 2 experience entries, 2 projects, 1 certification. Return ONLY valid JSON.`, 2000);
      const data = JSON.parse(text.replace(/```json|```/g, "").trim());
      ["experience","education","projects","certifications"].forEach(k => {
        if (Array.isArray(data[k])) data[k].forEach((item, i) => { if (!item.id) item.id = uid() + i; });
      });
      setResume(data);
      toast("Resume generated!");
    } catch (e) { toast(e.message, "error"); }
    setLoad("full", false);
  };

  // ── ATS Checker ──────────────────────────────────────────────────────────────
  const runATSCheck = async () => {
    console.log("🔍 runATSCheck called"); // DEBUG
    
    if (!atsJD.trim()) { 
      toast("Please paste a job description first.", "error"); 
      console.warn("❌ No job description provided");
      return; 
    }
    
    console.log("✅ Job description provided, starting analysis...");
    setLoad("ats", true);
    setAtsResult(null);
    setAtsTab("overview");
    
    try {
      const resumeText = `
Name: ${resume.personal.firstName} ${resume.personal.lastName}
Title: ${resume.personal.title}
Summary: ${resume.summary}
Experience: ${resume.experience.map(e => `${e.role} at ${e.company}: ${e.description}`).join("\n")}
Skills: ${resume.skills.join(", ")}
Projects: ${resume.projects.map(p => `${p.name}: ${p.description} Technologies: ${p.technologies}`).join("\n")}
Certifications: ${resume.certifications.map(c => `${c.name} from ${c.issuer}`).join(", ")}
      `.trim();

      console.log("📝 Resume text prepared, calling AI...");
      
      const text = await callAI(`You are an expert ATS (Applicant Tracking System) analyzer. Analyze this resume against the job description.
Return ONLY valid JSON (no markdown, no preamble, no code fences) in this exact structure:
{
  "ats_score": <integer 0-100>,
  "verdict": "<one short phrase: 'Strong match', 'Moderate match', or 'Weak match'>",
  "score_description": "<2 sentences explaining the score>",
  "category_scores": {
    "skills_match": <0-100>,
    "experience_relevance": <0-100>,
    "education_fit": <0-100>,
    "keyword_density": <0-100>,
    "format_compatibility": <0-100>
  },
  "keywords_found": ["keyword1", "keyword2"],
  "keywords_missing": ["keyword1", "keyword2"],
  "keywords_partial": ["keyword1", "keyword2"],
  "total_jd_keywords": <integer>,
  "suggestions": [
    {"title": "short title", "detail": "actionable advice", "priority": "high"},
    {"title": "short title", "detail": "actionable advice", "priority": "high"},
    {"title": "short title", "detail": "actionable advice", "priority": "medium"},
    {"title": "short title", "detail": "actionable advice", "priority": "medium"},
    {"title": "short title", "detail": "actionable advice", "priority": "low"}
  ]
}

RESUME:
${resumeText}

JOB DESCRIPTION:
${atsJD}`, 1400);

      console.log("✅ AI response received:", text.substring(0, 100) + "...");
      
      const clean = text.replace(/```json|```/g, "").trim();
      console.log("🔧 Cleaned response:", clean.substring(0, 100) + "...");
      
      const result = JSON.parse(clean);
      console.log("✅ JSON parsed successfully:", result);
      
      setAtsResult(result);
      toast("✅ ATS analysis complete!");
    } catch (e) { 
      console.error("❌ ERROR in runATSCheck:", e);
      console.error("Error message:", e.message);
      console.error("Error stack:", e.stack);
      toast(`❌ Error: ${e.message}`, "error"); 
    } finally {
      setLoad("ats", false);
      console.log("✅ Analysis complete (finally block)");
    }
  };

  const applyATSSkills = () => {
    if (atsResult?.keywords_missing?.length) {
      upd({ skills: [...new Set([...resume.skills, ...atsResult.keywords_missing])] });
      toast(`Added ${atsResult.keywords_missing.length} missing keywords as skills!`);
    }
  };

  // ── Certificate Analyzer ──────────────────────────────────────────────────────────
  const handleCertUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log("📁 File selected:", file.name, "Type:", file.type);
    
    setCertFile(file);
    setCertAnalysis(null);
    setCertSelected({});

    // Show preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (evt) => setCertPreview(evt.target?.result);
      reader.readAsDataURL(file);
    } else {
      setCertPreview(null);
    }
    
    // Auto-extract text from the file
    setLoad("cert", true);
    try {
      console.log("🔄 Starting automatic text extraction...");
      const extractedText = await extractTextFromFile(file, (message) => {
        // Show extraction progress in a toast
        console.log("📊 " + message);
      });
      
      console.log("✅ Text extraction successful, length:", extractedText.length);
      setCertContent(extractedText);
      toast("✅ Certificate text auto-extracted! Ready to analyze.", "success");
      
      // Optionally auto-analyze
      console.log("🤖 Ready to analyze. Click 'Analyze Certificate' to proceed.");
      
    } catch (error) {
      console.error("❌ Text extraction failed:", error);
      toast(`⚠️ Could not auto-extract: ${error.message}. Please paste text manually.`, "error");
      setCertContent("");
    } finally {
      setLoad("cert", false);
    }
  };

  const analyzeCertificate = async () => {
    console.log("🔍 analyzeCertificate called"); // DEBUG
    
    if (!certFile) { 
      toast("Please upload a certificate first.", "error");
      console.warn("❌ No certificate file selected"); 
      return; 
    }
    
    console.log("✅ Certificate file found:", certFile.name);
    setLoad("cert", true);
    setCertAnalysis(null);
    
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        console.log("📖 FileReader onload callback triggered");
        let certificateText = "";

        if (certFile.type.startsWith("image/")) {
          // For images: use the text from textarea
          console.log("🖼️ File is image, checking for text content");
          certificateText = certContent.trim();
          
          if (!certificateText) {
            // If no text provided for image, show helpful message
            setLoad("cert", false);
            toast("⚠️ For images, please paste the certificate content/text in the field above to analyze. The AI needs the text content.", "error");
            console.warn("⚠️ Image uploaded but no text content provided");
            return;
          }
        } else {
          // For text/pdf: use the file content
          console.log("📄 File is PDF/TXT, extracting text from file");
          certificateText = evt.target?.result?.toString?.() || "";
        }

        console.log("📝 Certificate text extracted, length:", certificateText.length);
        
        if (!certificateText.trim()) {
          toast("Certificate text is empty. Please paste certificate details.", "error");
          console.warn("❌ Certificate text is empty");
          setLoad("cert", false);
          return;
        }

        // Analyze the text
        const prompt = `Extract information from this certificate:
1. Name/Title
2. Issuer/Organization
3. Date Issued
4. Skills (extract 4-5 specific skills)
5. Achievements

Return ONLY this JSON format, no extra text:
{
  "name": "Certificate Name",
  "issuer": "Organization",
  "date": "2024",
  "skills": ["skill1", "skill2", "skill3", "skill4"],
  "achievements": ["achievement1", "achievement2"],
  "credentialId": null,
  "description": "Brief description"
}

Certificate Text:
${certificateText}`;

        try {
          console.log("🤖 Calling AI to analyze certificate...");
          const text = await callAI(prompt, 1000);
          console.log("✅ AI response received:", text.substring(0, 100) + "...");
          
          const clean = text.replace(/\`\`\`json|\`\`\`/g, "").trim();
          console.log("🔧 Cleaned response:", clean.substring(0, 100) + "...");
          
          const result = JSON.parse(clean);
          console.log("✅ JSON parsed successfully:", result);
          
          setCertAnalysis(result);
          toast("✓ Certificate analyzed! Select items to add.");
        } catch (err) {
          console.error("❌ Analysis error:", err);
          console.error("Error message:", err.message);
          console.error("Error stack:", err.stack);
          toast("❌ Failed to analyze: " + err.message, "error");
        }
        setLoad("cert", false);
        console.log("✅ Certificate analysis complete");
      };

      reader.onerror = (e) => {
        console.error("❌ FileReader error:", e);
        toast("❌ Error reading file: " + e.message, "error");
        setLoad("cert", false);
      };

      if (certFile.type.startsWith("image/")) {
        console.log("📖 Starting to read image as DataURL...");
        reader.readAsDataURL(certFile);
      } else {
        console.log("📖 Starting to read file as text...");
        reader.readAsText(certFile);
      }
    } catch (e) {
      console.error("❌ ERROR in try block:", e);
      toast("❌ " + e.message, "error");
      setLoad("cert", false);
    }
  };

  const addCertToResume = () => {
    if (!certAnalysis) return;
    const { name, issuer, date, skills, achievements, credentialId } = certAnalysis;
    
    // Add as certification
    const newCert = {
      id: uid(),
      name: name || "Untitled",
      issuer: issuer || "",
      date: date || "",
      credentialId: credentialId || "",
      link: "",
    };
    upd({ certifications: [...resume.certifications, newCert] });
    toast("✅ Certificate added!");
  };

  const addSkillsToResume = () => {
    if (!certAnalysis?.skills?.length) { toast("No skills to add.", "info"); return; }
    const selected = Object.keys(certSelected).filter(k => certSelected[k]);
    const toAdd = selected.length > 0 ? certAnalysis.skills.filter((_, i) => selected.includes(i.toString())) : certAnalysis.skills;
    upd({ skills: [...new Set([...resume.skills, ...toAdd])] });
    toast(`✅ Added ${toAdd.length} skill(s)!`);
  };

  const addAchievementsToResume = () => {
    if (!certAnalysis?.achievements?.length) { toast("No achievements to add.", "info"); return; }
    const text = certAnalysis.achievements.map(a => `• ${a}`).join("\n");
    upd({ summary: resume.summary ? resume.summary + "\n" + text : text });
    toast("✅ Achievements added to summary!");
  };

  const exportJSON = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" }));
    a.download = "resume.json"; a.click();
    toast("Exported as JSON!"); setExportOpen(false);
  };

  const exportText = () => {
    const p = resume.personal;
    let t = `${p.firstName} ${p.lastName}\n${p.title}\n${[p.email, p.phone, p.location].filter(Boolean).join(" | ")}\n\n`;
    if (resume.summary) t += `PROFESSIONAL SUMMARY\n${resume.summary}\n\n`;
    if (resume.experience.length) { t += "EXPERIENCE\n"; resume.experience.forEach(e => { t += `${e.role} at ${e.company}\n${e.startDate} – ${e.current ? "Present" : e.endDate}\n${e.description}\n\n`; }); }
    if (resume.education.length) { t += "EDUCATION\n"; resume.education.forEach(e => { t += `${e.degree}${e.field ? " in " + e.field : ""} | ${e.school} | ${e.gradYear}\n`; }); t += "\n"; }
    if (resume.skills.length) t += `SKILLS\n${resume.skills.join(", ")}\n\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([t], { type: "text/plain" }));
    a.download = "resume.txt"; a.click();
    toast("Exported as text!"); setExportOpen(false);
  };

  const exportPDF = async () => {
    setExportOpen(false);
    toast("Generating PDF…", "info");

    try {
      const html2canvasModule = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const html2canvas = html2canvasModule.default;

      const previewElement = document.querySelector('.resume-preview');
      if (!previewElement) {
        toast("Preview not found. Please try again.", "error");
        return;
      }

      // Temporarily make the element visible if it's hidden (mobile view)
      const parentPanel = previewElement.closest('[data-preview-panel]');
      const wasHidden = parentPanel && parentPanel.style.display === 'none';
      if (wasHidden) {
        parentPanel.style.visibility = 'hidden';  // invisible but rendered
        parentPanel.style.display = 'block';
      }

      const canvas = await html2canvas(previewElement, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Restore original state
      if (wasHidden) {
        parentPanel.style.display = 'none';
        parentPanel.style.visibility = '';
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth  = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgData   = canvas.toDataURL('image/jpeg', 0.97);

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('resume.pdf');
      toast("PDF downloaded!", "success");
    } catch (err) {
      console.error("PDF export error:", err);
      toast("PDF export failed: " + err.message, "error");
    }
  };

  const exportWord = async () => {
    setExportOpen(false);
    toast("Generating Word document…", "info");

    try {
      const {
        Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle,
      } = await import('docx');

      const p = resume.personal;
      const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Your Name';

      // ── helpers ──────────────────────────────────────────────────────────
      const sectionHeading = (text) =>
        new Paragraph({
          text,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1a1a2e', space: 4 } },
        });

      const bodyPara = (text, opts = {}) =>
        new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: text || '', ...opts })],
        });

      const boldPara = (text) => bodyPara(text, { bold: true });
      const mutedPara = (text) =>
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: text || '', color: '666666', size: 20 })],
        });

      // ── document children ─────────────────────────────────────────────────
      const children = [];

      // Header — name
      children.push(
        new Paragraph({
          children: [new TextRun({ text: name, bold: true, size: 48, color: '1a1a2e' })],
          spacing: { after: 60 },
        })
      );

      // Title
      if (p.title) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: p.title, size: 26, color: '555555' })],
            spacing: { after: 60 },
          })
        );
      }

      // Contact line
      const contacts = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean);
      if (contacts.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: contacts.join('  |  '), size: 20, color: '666666' })],
            spacing: { after: 160 },
          })
        );
      }

      // Summary
      if (resume.summary) {
        children.push(sectionHeading('Professional Summary'));
        children.push(bodyPara(resume.summary));
      }

      // Experience
      if (resume.experience.length) {
        children.push(sectionHeading('Experience'));
        resume.experience.forEach(e => {
          const dates = [e.startDate, e.current ? 'Present' : e.endDate].filter(Boolean).join(' – ');
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: e.role || '', bold: true }),
                new TextRun({ text: e.company ? `  ·  ${e.company}` : '', color: '444444' }),
                new TextRun({ text: e.location ? `, ${e.location}` : '', color: '666666' }),
              ],
            })
          );
          if (dates) children.push(mutedPara(dates));
          if (e.description) {
            e.description.split('\n').forEach(line => {
              if (line.trim()) children.push(bodyPara(line.trim()));
            });
          }
          children.push(new Paragraph({ spacing: { after: 100 } }));
        });
      }

      // Education
      if (resume.education.length) {
        children.push(sectionHeading('Education'));
        resume.education.forEach(e => {
          const degree = `${e.degree || ''}${e.field ? ' in ' + e.field : ''}`;
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: degree, bold: true }),
                new TextRun({ text: `  —  ${e.school || ''}`, color: '444444' }),
                new TextRun({ text: e.gradYear ? `  ·  ${e.gradYear}` : '', color: '888888' }),
              ],
            })
          );
        });
      }

      // Skills
      if (resume.skills.length) {
        children.push(sectionHeading('Skills'));
        children.push(bodyPara(resume.skills.join(', ')));
      }

      // Projects
      if (resume.projects.length) {
        children.push(sectionHeading('Projects'));
        resume.projects.forEach(pr => {
          children.push(boldPara(pr.name || ''));
          if (pr.technologies) children.push(mutedPara(pr.technologies));
          if (pr.description) children.push(bodyPara(pr.description));
          if (pr.link) children.push(mutedPara(pr.link));
          children.push(new Paragraph({ spacing: { after: 80 } }));
        });
      }

      // Certifications
      if (resume.certifications.length) {
        children.push(sectionHeading('Certifications'));
        resume.certifications.forEach(c => {
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: c.name || '', bold: true }),
                new TextRun({ text: c.issuer ? `  —  ${c.issuer}` : '', color: '444444' }),
                new TextRun({ text: c.date ? `,  ${c.date}` : '', color: '888888' }),
              ],
            })
          );
        });
      }

      // ── build & download ─────────────────────────────────────────────────
      const doc = new Document({
        sections: [{
          properties: {},
          children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Word document exported!", "success");
    } catch (err) {
      console.error("Word export error:", err);
      toast("Word export failed: " + err.message, "error");
    }
  };

  // Helper to escape HTML special characters
  const escHtml = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  // ── Template-aware Preview ────────────────────────────────────────────────
  const previewHTML = () => {
    const p = resume.personal;
    const name = `${p.firstName || ""} ${p.lastName || ""}`.trim();
    const T = currentTemplate.preview;
    const a = accent;

    if (activeTemplate === "slate") {
      let left = `<div style="width:38%;background:${a};color:#fff;padding:16px;min-height:100%;box-sizing:border-box;">`;
      left += `<div style="font-size:16px;font-weight:900;margin-bottom:2px">${esc(name) || "Your Name"}</div>`;
      if (p.title) left += `<div style="font-size:9px;opacity:.8;margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">${esc(p.title)}</div>`;
      const contacts = [p.email, p.phone, p.location, p.linkedin].filter(Boolean);
      if (contacts.length) left += `<div style="font-size:8px;opacity:.75;margin-bottom:14px;line-height:1.8">${contacts.map(esc).join("<br>")}</div>`;
      if (resume.skills.length) { left += `<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.6;margin-bottom:6px">Skills</div>`; left += `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:14px">${resume.skills.map(s => `<span style="background:rgba(255,255,255,.15);color:#fff;padding:2px 6px;border-radius:4px;font-size:7px">${esc(s)}</span>`).join("")}</div>`; }
      if (resume.education.length) { left += `<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.6;margin-bottom:6px">Education</div>`; resume.education.forEach(e => { left += `<div style="margin-bottom:8px"><div style="font-size:9px;font-weight:700">${esc(e.degree)}${e.field ? " in " + esc(e.field) : ""}</div><div style="font-size:8px;opacity:.8">${esc(e.school)}</div><div style="font-size:7px;opacity:.6">${esc(e.gradYear)}</div></div>`; }); }
      left += "</div>";
      let right = `<div style="flex:1;padding:16px;box-sizing:border-box;">`;
      if (resume.summary) { right += `<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${a};margin-bottom:5px">Summary</div><div style="font-size:9px;color:#444;margin-bottom:12px;line-height:1.5">${esc(resume.summary)}</div>`; }
      if (resume.experience.length) { right += `<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${a};margin-bottom:6px">Experience</div>`; resume.experience.forEach(e => { const dates = [e.startDate, e.current ? "Present" : e.endDate].filter(Boolean).join(" – "); right += `<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between"><span style="font-weight:700;font-size:9px">${esc(e.role)}</span><span style="font-size:8px;color:#777">${dates}</span></div><div style="font-size:8px;color:${a};margin-bottom:2px">${esc(e.company)}</div><div style="font-size:8px;color:#555">${esc(e.description).replace(/\n/g, "<br>")}</div></div>`; }); }
      if (resume.projects.length) { right += `<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${a};margin-bottom:6px;margin-top:8px">Projects</div>`; resume.projects.forEach(pr => { right += `<div style="margin-bottom:7px"><div style="font-size:9px;font-weight:700">${esc(pr.name)}</div>${pr.technologies ? `<div style="font-size:8px;color:${a}">${esc(pr.technologies)}</div>` : ""}<div style="font-size:8px;color:#555">${esc(pr.description)}</div></div>`; }); }
      right += "</div>";
      return `<div style="font-family:-apple-system,sans-serif;font-size:10px;display:flex;min-height:400px;">${left}${right}</div>`;
    }

    if (activeTemplate === "minimal") {
      let h = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;line-height:1.6;color:#111;">`;
      h += `<div style="border-bottom:1px solid #111;padding-bottom:10px;margin-bottom:14px"><div style="font-size:18px;font-weight:900;letter-spacing:-1px">${esc(name) || "Your Name"}</div>`;
      if (p.title) h += `<div style="font-size:11px;color:#555;margin-top:2px">${esc(p.title)}</div>`;
      const contacts = [p.email, p.phone, p.location].filter(Boolean);
      if (contacts.length) h += `<div style="font-size:9px;color:#777;margin-top:4px">${contacts.map(esc).join("  ·  ")}</div>`;
      h += "</div>";
      const sec = (title, content) => `<div style="margin-bottom:13px"><div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#777;margin-bottom:6px">${title}</div>${content}</div>`;
      if (resume.summary) h += sec("Profile", `<div style="font-size:9px;color:#333">${esc(resume.summary)}</div>`);
      if (resume.experience.length) h += sec("Experience", resume.experience.map(e => { const dates = [e.startDate, e.current ? "Present" : e.endDate].filter(Boolean).join("–"); return `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><span style="font-weight:700;font-size:10px">${esc(e.role)}</span><span style="font-size:8px;color:#777">${dates}</span></div><div style="font-size:9px;color:#555">${esc(e.company)}</div><div style="font-size:9px;color:#333;margin-top:2px">${esc(e.description).replace(/\n/g, "<br>")}</div></div>`; }).join(""));
      if (resume.education.length) h += sec("Education", resume.education.map(e => `<div><span style="font-weight:700">${esc(e.degree)}${e.field?" in "+esc(e.field):""}</span> · ${esc(e.school)} · ${esc(e.gradYear)}</div>`).join(""));
      if (resume.skills.length) h += sec("Skills", `<div style="font-size:9px;color:#333">${resume.skills.map(esc).join("  ·  ")}</div>`);
      return h + "</div>";
    }

    if (activeTemplate === "executive") {
      let h = `<div style="font-family:'Georgia',serif;font-size:10px;line-height:1.6;color:#111;">`;
      h += `<div style="background:#1a1a2e;color:#fff;padding:18px 20px;margin-bottom:16px;">`;
      h += `<div style="font-size:20px;font-weight:900;letter-spacing:-.5px">${esc(name) || "Your Name"}</div>`;
      if (p.title) h += `<div style="font-size:10px;color:#a5b4fc;font-weight:600;margin-top:3px;text-transform:uppercase;letter-spacing:1px">${esc(p.title)}</div>`;
      const contacts = [p.email, p.phone, p.location, p.linkedin].filter(Boolean);
      if (contacts.length) h += `<div style="font-size:8px;color:#94a3b8;margin-top:8px;display:flex;gap:12px;flex-wrap:wrap">${contacts.map(c => `<span>${esc(c)}</span>`).join("")}</div>`;
      h += `</div>`;
      const sec = (title, content) => `<div style="margin:0 20px 14px"><div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#1a1a2e;border-left:3px solid #1a1a2e;padding-left:8px;margin-bottom:7px">${title}</div>${content}</div>`;
      if (resume.summary) h += sec("Executive Summary", `<div style="font-size:9px;color:#444;line-height:1.6">${esc(resume.summary)}</div>`);
      if (resume.experience.length) h += sec("Experience", resume.experience.map(e => { const dates = [e.startDate, e.current ? "Present" : e.endDate].filter(Boolean).join(" – "); return `<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between"><span style="font-weight:700;font-size:10px">${esc(e.role)}</span><span style="font-size:8px;color:#777;background:#f1f5f9;padding:1px 6px;border-radius:3px">${dates}</span></div><div style="font-size:9px;color:#1a1a2e;font-weight:600">${esc(e.company)}</div><div style="font-size:9px;color:#444;margin-top:2px">${esc(e.description).replace(/\n/g, "<br>")}</div></div>`; }).join(""));
      if (resume.education.length) h += sec("Education", resume.education.map(e => `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span><span style="font-weight:700;font-size:10px">${esc(e.degree)}${e.field ? " in " + esc(e.field) : ""}</span> · <span style="color:#1a1a2e">${esc(e.school)}</span></span><span style="font-size:9px;color:#777">${esc(e.gradYear)}</span></div>`).join(""));
      if (resume.skills.length) h += sec("Core Competencies", `<div style="display:flex;flex-wrap:wrap;gap:4px">${resume.skills.map(s => `<span style="background:#e8eaf6;color:#1a1a2e;padding:2px 8px;border-radius:3px;font-size:8px;font-weight:600">${esc(s)}</span>`).join("")}</div>`);
      if (resume.certifications.length) h += sec("Certifications", resume.certifications.map(c => `<div style="margin-bottom:4px"><span style="font-weight:700;font-size:9px">${esc(c.name)}</span> · <span style="font-size:9px;color:#1a1a2e">${esc(c.issuer)}</span> <span style="font-size:8px;color:#777">${esc(c.date)}</span></div>`).join(""));
      return h + "</div>";
    }

    if (activeTemplate === "sunset") {
      let h = `<div style="font-family:-apple-system,sans-serif;font-size:10px;line-height:1.6;color:#111;">`;
      h += `<div style="background:linear-gradient(135deg,#c2410c,#ea580c,#f97316);color:#fff;padding:18px 20px;margin-bottom:16px;border-radius:0 0 12px 12px;">`;
      h += `<div style="font-size:19px;font-weight:900">${esc(name) || "Your Name"}</div>`;
      if (p.title) h += `<div style="font-size:10px;opacity:.85;margin-top:3px;font-weight:500">${esc(p.title)}</div>`;
      const contacts = [p.email, p.phone, p.location].filter(Boolean);
      if (contacts.length) h += `<div style="font-size:8px;opacity:.75;margin-top:7px">${contacts.map(esc).join("  |  ")}</div>`;
      h += `</div>`;
      const sec = (title, content) => `<div style="margin:0 16px 13px"><div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c2410c;margin-bottom:6px;padding-bottom:3px;border-bottom:2px solid #fed7aa">${title}</div>${content}</div>`;
      if (resume.summary) h += sec("About Me", `<div style="font-size:9px;color:#333">${esc(resume.summary)}</div>`);
      if (resume.experience.length) h += sec("Experience", resume.experience.map(e => { const dates = [e.startDate, e.current ? "Present" : e.endDate].filter(Boolean).join(" – "); return `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><span style="font-weight:700;font-size:10px;color:#111">${esc(e.role)}</span><span style="font-size:8px;color:#c2410c;font-weight:600">${dates}</span></div><div style="font-size:9px;color:#ea580c">${esc(e.company)}</div><div style="font-size:9px;color:#444;margin-top:2px">${esc(e.description).replace(/\n/g, "<br>")}</div></div>`; }).join(""));
      if (resume.education.length) h += sec("Education", resume.education.map(e => `<div style="margin-bottom:4px"><span style="font-weight:700">${esc(e.degree)}${e.field ? " in " + esc(e.field) : ""}</span> · ${esc(e.school)} · <span style="color:#c2410c">${esc(e.gradYear)}</span></div>`).join(""));
      if (resume.skills.length) h += sec("Skills", `<div style="display:flex;flex-wrap:wrap;gap:4px">${resume.skills.map(s => `<span style="background:#fff7ed;color:#c2410c;padding:2px 8px;border-radius:999px;font-size:8px;font-weight:600;border:1px solid #fed7aa">${esc(s)}</span>`).join("")}</div>`);
      if (resume.projects.length) h += sec("Projects", resume.projects.map(pr => `<div style="margin-bottom:7px"><div style="font-weight:700;font-size:10px">${esc(pr.name)}</div>${pr.technologies ? `<div style="font-size:8px;color:#ea580c">${esc(pr.technologies)}</div>` : ""}<div style="font-size:8px;color:#444">${esc(pr.description)}</div></div>`).join(""));
      return h + "</div>";
    }

    if (activeTemplate === "elegant") {
      let main = `<div style="flex:1;padding:16px;box-sizing:border-box;">`;
      main += `<div style="margin-bottom:14px;padding-bottom:10px;border-bottom:3px double #92400e">`;
      main += `<div style="font-size:19px;font-weight:900;font-family:'Georgia',serif">${esc(name) || "Your Name"}</div>`;
      if (p.title) main += `<div style="font-size:10px;color:#92400e;font-style:italic;margin-top:3px">${esc(p.title)}</div>`;
      main += `</div>`;
      const sec = (title, content) => `<div style="margin-bottom:12px"><div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#92400e;margin-bottom:6px">${title}</div>${content}</div>`;
      if (resume.summary) main += sec("Profile", `<div style="font-size:9px;color:#333;font-style:italic;line-height:1.6">${esc(resume.summary)}</div>`);
      if (resume.experience.length) main += sec("Experience", resume.experience.map(e => { const dates = [e.startDate, e.current ? "Present" : e.endDate].filter(Boolean).join(" – "); return `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between"><span style="font-weight:700;font-size:10px;font-family:'Georgia',serif">${esc(e.role)}</span><span style="font-size:8px;color:#777">${dates}</span></div><div style="font-size:9px;color:#92400e">${esc(e.company)}</div><div style="font-size:9px;color:#444;margin-top:2px">${esc(e.description).replace(/\n/g, "<br>")}</div></div>`; }).join(""));
      if (resume.projects.length) main += sec("Projects", resume.projects.map(pr => `<div style="margin-bottom:6px"><div style="font-weight:700;font-size:9px">${esc(pr.name)}</div>${pr.technologies ? `<div style="font-size:8px;color:#92400e;font-style:italic">${esc(pr.technologies)}</div>` : ""}<div style="font-size:8px;color:#444">${esc(pr.description)}</div></div>`).join(""));
      main += `</div>`;
      let side = `<div style="width:36%;background:#fef9f0;border-left:3px solid #92400e;padding:16px;box-sizing:border-box;">`;
      const sideSec = (title, content) => `<div style="margin-bottom:12px"><div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#92400e;margin-bottom:5px;padding-bottom:3px;border-bottom:1px solid #d4a96a">${title}</div>${content}</div>`;
      const contacts = [p.email, p.phone, p.location, p.linkedin].filter(Boolean);
      if (contacts.length) side += sideSec("Contact", `<div style="font-size:8px;color:#555;line-height:1.8">${contacts.map(esc).join("<br>")}</div>`);
      if (resume.skills.length) side += sideSec("Skills", resume.skills.map(s => `<div style="font-size:8px;color:#333;padding:2px 0;border-bottom:1px dotted #d4a96a">${esc(s)}</div>`).join(""));
      if (resume.education.length) side += sideSec("Education", resume.education.map(e => `<div style="margin-bottom:6px"><div style="font-size:9px;font-weight:700">${esc(e.school)}</div><div style="font-size:8px;color:#92400e">${esc(e.degree)}${e.field ? " in " + esc(e.field) : ""}</div><div style="font-size:7px;color:#777">${esc(e.gradYear)}</div></div>`).join(""));
      if (resume.certifications.length) side += sideSec("Certifications", resume.certifications.map(c => `<div style="margin-bottom:5px"><div style="font-size:8px;font-weight:700">${esc(c.name)}</div><div style="font-size:7px;color:#92400e">${esc(c.issuer)} · ${esc(c.date)}</div></div>`).join(""));
      side += `</div>`;
      return `<div style="font-family:'Georgia',serif;font-size:10px;display:flex;min-height:400px;">${main}${side}</div>`;
    }

    if (activeTemplate === "teal") {
      let h = `<div style="font-family:-apple-system,sans-serif;font-size:10px;line-height:1.6;color:#111;">`;
      h += `<div style="background:#0f766e;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">`;
      h += `<div><div style="font-size:19px;font-weight:900;color:#fff">${esc(name) || "Your Name"}</div>`;
      if (p.title) h += `<div style="font-size:9px;color:#99f6e4;margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:.8px">${esc(p.title)}</div></div>`;
      const contacts = [p.email, p.phone, p.location].filter(Boolean);
      if (contacts.length) h += `<div style="text-align:right;font-size:8px;color:#ccfbf1;line-height:1.8">${contacts.map(esc).join("<br>")}</div>`;
      h += `</div>`;
      const sec = (title, content) => `<div style="margin:0 16px 13px"><div style="display:flex;align-items:center;gap:6px;margin-bottom:7px"><div style="width:14px;height:14px;background:#0f766e;border-radius:3px;display:flex;align-items:center;justify-content:center"></div><div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#0f766e">${title}</div></div>${content}</div>`;
      if (resume.summary) h += sec("Summary", `<div style="font-size:9px;color:#333;background:#f0fdfa;padding:8px;border-radius:6px;border-left:3px solid #0f766e">${esc(resume.summary)}</div>`);
      if (resume.experience.length) h += sec("Experience", resume.experience.map(e => { const dates = [e.startDate, e.current ? "Present" : e.endDate].filter(Boolean).join(" – "); return `<div style="margin-bottom:9px;padding-left:8px;border-left:2px solid #ccfbf1"><div style="display:flex;justify-content:space-between"><span style="font-weight:700;font-size:10px">${esc(e.role)}</span><span style="font-size:8px;background:#f0fdfa;color:#0f766e;padding:1px 6px;border-radius:3px">${dates}</span></div><div style="font-size:9px;color:#0f766e;font-weight:600">${esc(e.company)}</div><div style="font-size:9px;color:#444;margin-top:2px">${esc(e.description).replace(/\n/g, "<br>")}</div></div>`; }).join(""));
      if (resume.education.length) h += sec("Education", resume.education.map(e => `<div style="display:flex;justify-content:space-between;margin-bottom:5px"><span><span style="font-weight:700">${esc(e.degree)}${e.field ? " in " + esc(e.field) : ""}</span> · <span style="color:#0f766e">${esc(e.school)}</span></span><span style="font-size:8px;color:#777">${esc(e.gradYear)}</span></div>`).join(""));
      if (resume.skills.length) h += sec("Skills", `<div style="display:flex;flex-wrap:wrap;gap:4px">${resume.skills.map(s => `<span style="background:#ccfbf1;color:#0f766e;padding:2px 8px;border-radius:999px;font-size:8px;font-weight:600">${esc(s)}</span>`).join("")}</div>`);
      if (resume.projects.length) h += sec("Projects", resume.projects.map(pr => `<div style="margin-bottom:7px"><div style="font-weight:700;font-size:10px">${esc(pr.name)}</div>${pr.technologies ? `<div style="font-size:8px;color:#0f766e">${esc(pr.technologies)}</div>` : ""}<div style="font-size:8px;color:#444">${esc(pr.description)}</div></div>`).join(""));
      return h + "</div>";
    }

    // Default colored templates (classic, midnight, forest, purple)
    let h = `<div style="font-family:'Georgia',serif;font-size:11px;line-height:1.6;color:#111;">`;
    h += `<div style="font-size:20px;font-weight:800;letter-spacing:-.5px">${esc(name) || "Your Name"}</div>`;
    if (p.title) h += `<div style="font-size:12px;color:${a};font-weight:600;margin:2px 0 8px">${esc(p.title)}</div>`;
    const contacts = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean);
    if (contacts.length) h += `<div style="font-size:10px;color:#555;padding-bottom:10px;border-bottom:2px solid ${a};margin-bottom:14px">${contacts.map(esc).join(" • ")}</div>`;
    const sec = (title, content) => `<div style="margin-bottom:14px"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${a};border-bottom:1px solid #e8e0df;padding-bottom:3px;margin-bottom:8px">${title}</div>${content}</div>`;
    if (resume.summary) h += sec("Summary", `<div style="font-size:10px;color:#333">${esc(resume.summary)}</div>`);
    if (resume.experience.length) h += sec("Experience", resume.experience.map(e => { const dates = [e.startDate, e.current ? "Present" : e.endDate].filter(Boolean).join(" – "); return `<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between"><span style="font-weight:700;font-size:11px">${esc(e.role)}</span><span style="font-size:9px;color:#777">${dates}</span></div><div style="font-size:10px;font-style:italic;color:${a}">${esc(e.company)}${e.location ? ", " + esc(e.location) : ""}</div><div style="font-size:10px;color:#444;margin-top:3px">${esc(e.description).replace(/\n/g, "<br>")}</div></div>`; }).join(""));
    if (resume.education.length) h += sec("Education", resume.education.map(e => `<div style="display:flex;justify-content:space-between;margin-bottom:5px"><span><span style="font-weight:700;font-size:11px">${esc(e.degree)}${e.field ? " in " + esc(e.field) : ""}</span><br><span style="font-size:10px;font-style:italic;color:${a}">${esc(e.school)}</span></span><span style="font-size:9px;color:#777">${esc(e.gradYear)}</span></div>`).join(""));
    if (resume.skills.length) h += sec("Skills", `<div style="display:flex;flex-wrap:wrap;gap:4px">${resume.skills.map(s => `<span style="background:${T.tag};color:${T.tagText};padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600">${esc(s)}</span>`).join("")}</div>`);
    if (resume.projects.length) h += sec("Projects", resume.projects.map(pr => `<div style="margin-bottom:8px"><div style="font-weight:700;font-size:11px">${esc(pr.name)}</div>${pr.technologies ? `<div style="font-size:10px;font-style:italic;color:${a}">${esc(pr.technologies)}</div>` : ""}<div style="font-size:10px;color:#444">${esc(pr.description)}</div></div>`).join(""));
    if (resume.certifications.length) h += sec("Certifications", resume.certifications.map(c => `<div style="display:flex;justify-content:space-between;margin-bottom:5px"><span><span style="font-weight:700;font-size:11px">${esc(c.name)}</span><br><span style="font-size:10px;font-style:italic;color:${a}">${esc(c.issuer)}</span></span><span style="font-size:9px;color:#777">${esc(c.date)}</span></div>`).join(""));
    return h + "</div>";
  };

  // ── Color System — strictly using the Coolors palette ─────────────────────
  // Dark mode: deep blacks + dark surfaces from the palette
  // Light mode: off-white backgrounds + dark text from the palette
  const C = dark ? {
    bg:           P.black,       // #0b090a — deepest background
    surface:      P.darkSurf,    // #161a1d — cards, panels
    elevated:     "#1e2428",     // slightly lighter than darkSurf for hover states
    input:        "#0f1316",     // input fields, slightly darker than bg
    text:         P.offWhite,    // #f5f3f4 — primary text
    muted:        P.lightGray,   // #d3d3d3 — secondary text
    faint:        P.warmGray,    // #b1a7a6 — tertiary / placeholder
    border:       "rgba(177,167,166,.10)", // warmGray at low opacity
    borderStrong: "rgba(177,167,166,.25)", // warmGray at medium opacity
    headerBg:     P.darkSurf,    // #161a1d
    headerText:   P.offWhite,    // #f5f3f4
    headerFaint:  P.warmGray,    // #b1a7a6
    headerBorder: "rgba(177,167,166,.09)",
    sidebarBg:    P.darkSurf,    // #161a1d
    sidebarText:  P.lightGray,   // #d3d3d3
    sidebarFaint: P.warmGray,    // #b1a7a6
    sidebarBorder: "rgba(255,255,255,.06)",
    previewBg:    "transparent",
    red:          P.brightRed,   // #e5383b — primary action color
    redMid:       P.red,         // #ba181b
    redDark:      P.midRed,      // #a4161a
    redDeep:      P.deepRed,     // #660708
    skillBg:      `rgba(186,24,27,.14)`,
    skillBorder:  `rgba(229,56,59,.28)`,
  } : {
    bg:           P.offWhite,    // #f5f3f4 — light background
    surface:      P.white,       // #ffffff — cards
    elevated:     "#ede9e8",     // slightly darker than offWhite
    input:        P.white,       // #ffffff
    text:         P.black,       // #0b090a — primary text
    muted:        "#3a2f2f",     // dark warm tone for secondary text
    faint:        "#7a6f6f",     // mid-warm for tertiary text
    border:       "rgba(11,9,10,.09)",
    borderStrong: "rgba(11,9,10,.22)",
    headerBg:     P.black,       // #0b090a — header stays dark
    headerText:   P.offWhite,    // #f5f3f4
    headerFaint:  P.warmGray,    // #b1a7a6
    headerBorder: "rgba(11,9,10,.0)",
    sidebarBg:    P.offWhite,    // #f5f3f4 — sidebar is light in light mode
    sidebarText:  "#3a2f2f",     // dark text in light mode
    sidebarFaint: "#7a6f6f",     // muted text
    sidebarBorder: "rgba(11,9,10,.08)",
    previewBg:    P.offWhite,    // #f5f3f4
    red:          P.red,         // #ba181b — slightly calmer red on light
    redMid:       P.midRed,      // #a4161a
    redDark:      P.deepRed,     // #660708
    redDeep:      P.deepRed,     // #660708
    skillBg:      `rgba(164,22,26,.08)`,
    skillBorder:  `rgba(164,22,26,.22)`,
  };

  const inputStyle = {
    padding: "9px 13px",
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    fontSize: 13,
    fontFamily: "inherit",
    color: C.text,
    background: C.input,
    width: "100%",
    outline: "none",
    transition: "border .2s, box-shadow .2s",
  };
  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: C.faint,
    textTransform: "uppercase",
    letterSpacing: ".5px",
    marginBottom: 6,
    display: "block",
  };
  const cardStyle = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    boxShadow: dark ? "none" : `0 1px 4px rgba(11,9,10,.07)`,
  };
  const btnPrimary = {
    padding: "9px 18px",
    background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`,
    color: P.white,
    border: "none",
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  };
  const btnSecondary = {
    padding: "8px 16px",
    background: "transparent",
    color: C.red,
    border: `1px solid ${C.borderStrong}`,
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
  const btnAI = {
    padding: "6px 13px",
    background: `linear-gradient(135deg, ${C.redDeep}, ${C.redDark})`,
    color: P.white,
    border: "none",
    borderRadius: 7,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  const ScoreRing = ({ score }) => {
    const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : P.brightRed;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ position: "relative", width: 90, height: 90 }}>
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="38" fill="none" stroke={C.border} strokeWidth="8" />
            <circle cx="45" cy="45" r="38" fill="none" stroke={color} strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 38 * score / 100} ${2 * Math.PI * 38 * (1 - score / 100)}`}
              strokeLinecap="round" transform="rotate(-90 45 45)" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color }}>{score}%</div>
        </div>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Match Score</div>
      </div>
    );
  };

  const renderSection = () => {
    switch (section) {
      case "personal": return (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 22, color: C.text }}>Personal Information</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label style={labelStyle}>First Name *</label><input style={inputStyle} value={resume.personal.firstName} onChange={e => updPersonal("firstName", e.target.value)} placeholder="John" /></div>
            <div><label style={labelStyle}>Last Name *</label><input style={inputStyle} value={resume.personal.lastName} onChange={e => updPersonal("lastName", e.target.value)} placeholder="Doe" /></div>
            <div style={{gridColumn:"1/-1"}}><label style={labelStyle}>Professional Title</label><input style={inputStyle} value={resume.personal.title} onChange={e => updPersonal("title", e.target.value)} placeholder="Senior Software Engineer" /></div>
            <div><label style={labelStyle}>Email *</label><input type="email" style={inputStyle} value={resume.personal.email} onChange={e => updPersonal("email", e.target.value)} placeholder="john@example.com" /></div>
            <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={resume.personal.phone} onChange={e => updPersonal("phone", e.target.value)} placeholder="+1 (555) 000-0000" /></div>
            <div><label style={labelStyle}>Location</label><input style={inputStyle} value={resume.personal.location} onChange={e => updPersonal("location", e.target.value)} placeholder="New York, NY" /></div>
            <div><label style={labelStyle}>LinkedIn URL</label><input style={inputStyle} value={resume.personal.linkedin} onChange={e => updPersonal("linkedin", e.target.value)} placeholder="linkedin.com/in/johndoe" /></div>
            <div><label style={labelStyle}>Portfolio/Website</label><input style={inputStyle} value={resume.personal.website} onChange={e => updPersonal("website", e.target.value)} placeholder="johndoe.com" /></div>
          </div>
        </div>
      );
      case "summary": return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Professional Summary</h2>
            <button style={btnAI} onClick={aiSummary} disabled={loading.summary}>{loading.summary ? <Spinner /> : "✨"} AI Write</button>
          </div>
          <label style={labelStyle}>Summary</label>
          <textarea value={resume.summary} onChange={e => upd({ summary: e.target.value })} placeholder="Highlight your key accomplishments..." style={{ ...inputStyle, minHeight: 140, resize: "vertical" }} />
        </div>
      );
      case "experience": return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Work Experience</h2>
            <button style={btnSecondary} onClick={addExp}>+ Add Experience</button>
          </div>
          {resume.experience.map(exp => (
            <div key={exp.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <div><div style={{ fontWeight: 700, color: C.text }}>{exp.role || "Job Title"}</div><div style={{ fontSize: 12, color: C.faint }}>{exp.company || "Company"}</div></div>
                <button onClick={() => delExp(exp.id)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={labelStyle}>Company</label><input style={inputStyle} value={exp.company} onChange={e => updExp(exp.id, "company", e.target.value)} placeholder="Company Inc." /></div>
                <div><label style={labelStyle}>Job Title</label><input style={inputStyle} value={exp.role} onChange={e => updExp(exp.id, "role", e.target.value)} placeholder="Senior Engineer" /></div>
                <div><label style={labelStyle}>Location</label><input style={inputStyle} value={exp.location} onChange={e => updExp(exp.id, "location", e.target.value)} placeholder="New York, NY" /></div>
                <div><label style={labelStyle}>Start Date</label><input style={inputStyle} value={exp.startDate} onChange={e => updExp(exp.id, "startDate", e.target.value)} placeholder="Jan 2020" /></div>
                <div><label style={labelStyle}>End Date</label><input style={inputStyle} value={exp.endDate} onChange={e => updExp(exp.id, "endDate", e.target.value)} placeholder="Present" disabled={exp.current} /></div>
                <div style={{ paddingTop: 22 }}><label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: C.muted, fontSize: 13 }}><input type="checkbox" checked={exp.current} onChange={e => updExp(exp.id, "current", e.target.checked)} /> Still working here</label></div>
                <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={exp.description} onChange={e => updExp(exp.id, "description", e.target.value)} placeholder="• Key achievements..." /></div>
              </div>
            </div>
          ))}
        </div>
      );
      case "education": return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Education</h2>
            <button style={btnSecondary} onClick={addEdu}>+ Add Education</button>
          </div>
          {resume.education.map(edu => (
            <div key={edu.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <div><div style={{ fontWeight: 700, color: C.text }}>{edu.degree || "Degree"}</div><div style={{ fontSize: 12, color: C.faint }}>{edu.school || "School"}</div></div>
                <button onClick={() => delEdu(edu.id)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={labelStyle}>School</label><input style={inputStyle} value={edu.school} onChange={e => updEdu(edu.id, "school", e.target.value)} placeholder="MIT" /></div>
                <div><label style={labelStyle}>Graduation Year</label><input style={inputStyle} value={edu.gradYear} onChange={e => updEdu(edu.id, "gradYear", e.target.value)} placeholder="2022" /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Degree</label><input style={inputStyle} value={edu.degree} onChange={e => updEdu(edu.id, "degree", e.target.value)} placeholder="Bachelor of Science" /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Field of Study</label><input style={inputStyle} value={edu.field} onChange={e => updEdu(edu.id, "field", e.target.value)} placeholder="Computer Science" /></div>
              </div>
            </div>
          ))}
        </div>
      );
      case "skills": return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Skills</h2>
            <button style={btnAI} onClick={aiSkills} disabled={loading.skills}>{loading.skills ? <Spinner /> : "✨"} AI Suggest</button>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addSkill()} placeholder="e.g. JavaScript, Project Management..." />
            <button style={btnSecondary} onClick={addSkill}>Add</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {resume.skills.map(s => (
              <span key={s} style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "6px 13px",
                background: C.skillBg,
                border: `1px solid ${C.skillBorder}`,
                color: C.red,
                borderRadius: 999, fontSize: 13, fontWeight: 500
              }}>
                {s}<button onClick={() => delSkill(s)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 15, padding: 0, opacity: .7 }}>✕</button>
              </span>
            ))}
          </div>
        </div>
      );
      case "projects": return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Projects</h2>
            <button style={btnSecondary} onClick={addProj}>+ Add Project</button>
          </div>
          {resume.projects.map(proj => (
            <div key={proj.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: C.text }}>{proj.name || "Project Name"}</div>
                <button onClick={() => delProj(proj.id)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Project Name</label><input style={inputStyle} value={proj.name} onChange={e => updProj(proj.id, "name", e.target.value)} placeholder="My Awesome Project" /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={proj.description} onChange={e => updProj(proj.id, "description", e.target.value)} placeholder="What it does..." /></div>
                <div><label style={labelStyle}>Technologies</label><input style={inputStyle} value={proj.technologies} onChange={e => updProj(proj.id, "technologies", e.target.value)} placeholder="React, Node.js" /></div>
                <div><label style={labelStyle}>Project Link</label><input style={inputStyle} value={proj.link} onChange={e => updProj(proj.id, "link", e.target.value)} placeholder="https://github.com/..." /></div>
              </div>
            </div>
          ))}
        </div>
      );
      case "certifications": return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Certifications & Awards</h2>
            <button style={btnSecondary} onClick={addCert}>+ Add Certification</button>
          </div>
          {resume.certifications.map(cert => (
            <div key={cert.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <div><div style={{ fontWeight: 700, color: C.text }}>{cert.name || "Certification"}</div><div style={{ fontSize: 12, color: C.faint }}>{cert.issuer || "Issuer"}</div></div>
                <button onClick={() => delCert(cert.id)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={labelStyle}>Certification Name</label><input style={inputStyle} value={cert.name} onChange={e => updCert(cert.id, "name", e.target.value)} placeholder="AWS Solutions Architect" /></div>
                <div><label style={labelStyle}>Issuing Organization</label><input style={inputStyle} value={cert.issuer} onChange={e => updCert(cert.id, "issuer", e.target.value)} placeholder="Amazon" /></div>
                <div><label style={labelStyle}>Issue Date</label><input style={inputStyle} value={cert.date} onChange={e => updCert(cert.id, "date", e.target.value)} placeholder="Jan 2023" /></div>
                <div><label style={labelStyle}>Credential ID</label><input style={inputStyle} value={cert.credentialId} onChange={e => updCert(cert.id, "credentialId", e.target.value)} placeholder="ABC-123" /></div>
                <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Credential URL</label><input style={inputStyle} value={cert.link} onChange={e => updCert(cert.id, "link", e.target.value)} placeholder="https://..." /></div>
              </div>
            </div>
          ))}
        </div>
      );

      case "atscheck": return (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 6 }}>🎯 ATS Score Checker</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Paste a job description to get your ATS match score, missing keywords, category breakdown, and actionable suggestions.</p>

          <label style={labelStyle}>Job Description</label>
          <textarea
            value={atsJD}
            onChange={e => setAtsJD(e.target.value)}
            placeholder="Paste the full job description here..."
            style={{ ...inputStyle, minHeight: 160, resize: "vertical", marginBottom: 14 }}
          />
          <button style={{ ...btnPrimary, width: "100%", justifyContent: "center", marginBottom: 24 }} onClick={runATSCheck} disabled={loading.ats}>
            {loading.ats ? <><Spinner /> Analyzing your resume...</> : "✨ Check ATS Score"}
          </button>

          {atsResult && (() => {
            const score = atsResult.ats_score;
            const scoreColor = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : P.brightRed;
            const cats = [
              { label: "Skills match",         key: "skills_match" },
              { label: "Experience relevance",  key: "experience_relevance" },
              { label: "Education fit",         key: "education_fit" },
              { label: "Keyword density",       key: "keyword_density" },
              { label: "Format compatibility",  key: "format_compatibility" },
            ];
            const prioColors = {
              high:   { bg: `rgba(229,56,59,.10)`,  border: `rgba(229,56,59,.28)`,  text: C.red },
              medium: { bg: `rgba(245,158,11,.10)`,  border: `rgba(245,158,11,.28)`,  text: "#f59e0b" },
              low:    { bg: `rgba(34,197,94,.10)`,  border: `rgba(34,197,94,.28)`,  text: "#22c55e" },
            };
            const tabs = ["overview", "keywords", "suggestions", "rewrite"];

            return (
              <div>
                {/* Tab Row */}
                <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
                  {tabs.map(t => (
                    <button key={t} onClick={() => setAtsTab(t)} style={{
                      padding: "6px 16px", borderRadius: 999, fontSize: 13, cursor: "pointer", transition: "all .15s",
                      background: atsTab === t ? accent : "transparent",
                      color: atsTab === t ? P.white : C.muted,
                      border: `1px solid ${atsTab === t ? accent : C.borderStrong}`,
                      fontWeight: atsTab === t ? 700 : 400,
                    }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* OVERVIEW TAB */}
                {atsTab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Score card */}
                    <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 24 }}>
                      <ScoreRing score={score} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>{atsResult.verdict}</div>
                        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{atsResult.score_description}</div>
                      </div>
                    </div>
                    {/* Metric pills */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                      {[
                        { label: "Found", val: (atsResult.keywords_found || []).length, sub: "keywords matched" },
                        { label: "Missing", val: (atsResult.keywords_missing || []).length, sub: "keywords absent" },
                        { label: "Partial", val: (atsResult.keywords_partial || []).length, sub: "close matches" },
                      ].map(m => (
                        <div key={m.label} style={{ background: C.elevated, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 11, color: C.faint, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{m.label}</div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>{m.val}</div>
                          <div style={{ fontSize: 11, color: C.faint }}>{m.sub}</div>
                        </div>
                      ))}
                    </div>
                    {/* Category bars */}
                    <div style={cardStyle}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>📊 Category Scores</div>
                      {cats.map(c => {
                        const v = (atsResult.category_scores || {})[c.key] || 0;
                        const barColor = v >= 70 ? "#22c55e" : v >= 45 ? "#f59e0b" : P.brightRed;
                        return (
                          <div key={c.key} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 5 }}>
                              <span>{c.label}</span><span style={{ fontWeight: 700, color: barColor }}>{v}%</span>
                            </div>
                            <div style={{ height: 6, background: C.elevated, borderRadius: 999, overflow: "hidden" }}>
                              <div style={{ width: `${v}%`, height: "100%", background: barColor, borderRadius: 999, transition: "width .7s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* KEYWORDS TAB */}
                {atsTab === "keywords" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      { label: "✅ Found in Resume", items: atsResult.keywords_found, bg: "rgba(34,197,94,.10)", border: "rgba(34,197,94,.28)", color: "#22c55e" },
                      { label: "❌ Missing Keywords", items: atsResult.keywords_missing, bg: `rgba(229,56,59,.10)`, border: `rgba(229,56,59,.28)`, color: C.red },
                      { label: "⚠️ Partial Matches", items: atsResult.keywords_partial, bg: `rgba(245,158,11,.10)`, border: `rgba(245,158,11,.28)`, color: "#f59e0b" },
                    ].map(section => section.items?.length > 0 && (
                      <div key={section.label} style={cardStyle}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{section.label}</div>
                          {section.label.includes("Missing") && (
                            <button style={btnAI} onClick={applyATSSkills}>+ Add All to Skills</button>
                          )}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {section.items.map(kw => (
                            <span key={kw} style={{ padding: "4px 12px", background: section.bg, border: `1px solid ${section.border}`, color: section.color, borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{kw}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* SUGGESTIONS TAB */}
                {atsTab === "suggestions" && (
                  <div style={cardStyle}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>💡 Actionable Suggestions</div>
                    {(atsResult.suggestions || []).map((s, i) => {
                      const p = s.priority || "medium";
                      const pc = prioColors[p] || prioColors.medium;
                      return (
                        <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < atsResult.suggestions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: pc.bg, border: `1px solid ${pc.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13 }}>
                            {p === "high" ? "🔴" : p === "medium" ? "🟡" : "🟢"}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>{s.title}</div>
                            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{s.detail}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* REWRITE TAB */}
                {atsTab === "rewrite" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={cardStyle}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>✏️ Rewrite a Bullet Point</div>
                      <p style={{ fontSize: 12, color: C.faint, marginBottom: 12 }}>Paste any experience bullet and get an AI-rewritten version targeting this job's missing keywords.</p>
                      <label style={labelStyle}>Your bullet point</label>
                      <textarea
                        value={atsBullet}
                        onChange={e => setAtsBullet(e.target.value)}
                        placeholder="e.g. Managed a team of engineers and shipped new features..."
                        style={{ ...inputStyle, minHeight: 90, resize: "vertical", marginBottom: 10 }}
                      />
                      <button
                        style={{ ...btnPrimary, justifyContent: "center" }}
                        disabled={loading.rewrite || !atsBullet.trim()}
                        onClick={async () => {
                          setLoad("rewrite", true);
                          try {
                            const rewritten = await callAI(`Rewrite this resume bullet point to better match the job. Incorporate these missing keywords where natural: ${(atsResult.keywords_missing || []).join(", ")}.
Original bullet: ${atsBullet}
Return ONLY the rewritten bullet. No preamble.`, 300);
                            setAtsBullet(rewritten);
                            toast("Bullet rewritten!");
                          } catch(e) { toast(e.message, "error"); }
                          setLoad("rewrite", false);
                        }}
                      >
                        {loading.rewrite ? <><Spinner /> Rewriting...</> : "✨ Rewrite Bullet"}
                      </button>
                    </div>
                    <div style={cardStyle}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>⚡ Quick AI Actions</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { label: "✨ Rewrite my summary for this job", action: async () => {
                            setLoad("atsSum", true);
                            try {
                              const txt = await callAI(`Rewrite this resume summary to better match the job. Missing keywords to include: ${(atsResult.keywords_missing || []).join(", ")}.
Current summary: ${resume.summary || "(empty)"}
Job description snippet: ${atsJD.slice(0, 600)}
Return ONLY the new summary text.`, 300);
                              upd({ summary: txt });
                              toast("Summary updated!");
                            } catch(e) { toast(e.message, "error"); }
                            setLoad("atsSum", false);
                          }},
                          { label: "⚡ Generate missing skills list", action: applyATSSkills },
                        ].map(a => (
                          <button key={a.label} style={{ ...btnSecondary, textAlign: "left", width: "100%", padding: "10px 14px" }}
                            disabled={loading.atsSum} onClick={a.action}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      );

      case "certanalyzer": return (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 6 }}>📸 Certificate Analyzer</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Upload a certificate image or document. AI will extract skills, achievements, and credentials—then add them to your resume with one click.</p>

          {/* Upload Section */}
          <div style={{ ...cardStyle, marginBottom: 20, textAlign: "center", border: `2px dashed ${C.border}`, padding: "40px 20px", cursor: "pointer", transition: "all .2s" }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleCertUpload({ target: { files: e.dataTransfer.files } }); }}>
            <input 
              type="file" 
              accept="image/*,application/pdf,.txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleCertUpload}
              style={{ display: "none" }}
              id="cert-upload"
            />
            <label htmlFor="cert-upload" style={{ cursor: "pointer" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                {certFile ? `📎 ${certFile.name}` : "Drag & drop or click to upload"}
              </div>
              <div style={{ fontSize: 12, color: C.faint }}>Supports: JPG, PNG, PDF, TXT, DOCX (auto-extracts text with OCR/parsing)</div>
            </label>
          </div>

          {/* Preview */}
          {certPreview && (
            <div style={{ ...cardStyle, marginBottom: 20, maxHeight: 300, overflow: "auto" }}>
              <img src={certPreview} alt="Certificate preview" style={{ maxWidth: "100%", borderRadius: 8 }} />
            </div>
          )}

          {/* Certificate Content Input */}
          {certPreview && (
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <label style={labelStyle}>📸 Extracted Certificate Text (Auto-extracted via OCR)</label>
              <textarea
                placeholder="Text automatically extracted from image using OCR. Edit if needed..."
                value={certContent}
                onChange={(e) => setCertContent(e.target.value)}
                style={{
                  ...inputStyle,
                  minHeight: 120,
                  resize: "vertical"
                }}
              />
            </div>
          )}

          {/* Text Input for Non-Image Files */}
          {certFile && !certFile.type.startsWith("image/") && (
            <div style={{ ...cardStyle, marginBottom: 20 }}>
              <label style={labelStyle}>📄 Extracted Certificate Text (Auto-extracted)</label>
              <textarea
                placeholder="Text automatically extracted from your document. Edit if needed..."
                value={certContent}
                onChange={(e) => setCertContent(e.target.value)}
                style={{
                  ...inputStyle,
                  minHeight: 120,
                  resize: "vertical"
                }}
              />
            </div>
          )}

          {/* Analyze Button */}
          <button
            style={{ ...btnPrimary, width: "100%", justifyContent: "center", marginBottom: 20 }}
            onClick={analyzeCertificate}
            disabled={loading.cert || !certFile}
          >
            {loading.cert ? <><Spinner /> Analyzing...</> : "🔍 Analyze Certificate"}
          </button>

          {/* Results */}
          {certAnalysis && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Extracted Info */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>📋 Extracted Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.faint, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Certificate Name</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{certAnalysis.name || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.faint, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Issuer</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{certAnalysis.issuer || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.faint, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Date</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{certAnalysis.date || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.faint, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Credential ID</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{certAnalysis.credentialId || "—"}</div>
                  </div>
                </div>

                <button
                  style={{ ...btnAI, width: "100%" }}
                  onClick={addCertToResume}
                >
                  ➕ Add Certificate to Resume
                </button>
              </div>

              {/* Skills */}
              {certAnalysis.skills?.length > 0 && (
                <div style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>⚡ Skills Found</h3>
                    <span style={{ fontSize: 12, color: C.faint }}>{certAnalysis.skills.length} skill(s)</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
                    {certAnalysis.skills.map((skill, i) => (
                      <label key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 999, cursor: "pointer", transition: "all .2s" }}>
                        <input
                          type="checkbox"
                          checked={certSelected[i] || false}
                          onChange={e => setCertSelected({ ...certSelected, [i]: e.target.checked })}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{skill}</span>
                      </label>
                    ))}
                  </div>
                  <button style={{ ...btnAI, width: "100%" }} onClick={addSkillsToResume}>
                    ➕ Add Selected Skills
                  </button>
                </div>
              )}

              {/* Achievements */}
              {certAnalysis.achievements?.length > 0 && (
                <div style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text }}>🎯 Achievements</h3>
                    <span style={{ fontSize: 12, color: C.faint }}>{certAnalysis.achievements.length} item(s)</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                    {certAnalysis.achievements.map((ach, i) => (
                      <div key={i} style={{ padding: "10px", background: C.elevated, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, color: C.text }}>
                        • {ach}
                      </div>
                    ))}
                  </div>
                  <button style={{ ...btnAI, width: "100%" }} onClick={addAchievementsToResume}>
                    ➕ Add to Summary
                  </button>
                </div>
              )}

              {/* Upload Another */}
              <div style={{ textAlign: "center" }}>
                <button
                  style={{ ...btnSecondary }}
                  onClick={() => {
                    setCertFile(null);
                    setCertPreview(null);
                    setCertAnalysis(null);
                    setCertSelected({});
                  }}
                >
                  📸 Upload Another Certificate
                </button>
              </div>
            </div>
          )}
        </div>
      );

      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sidebarSlideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        * { box-sizing: border-box; }
        input, textarea, select, button { max-width: 100%; }
        input:focus, textarea:focus {
          border-color: ${accent} !important;
          box-shadow: 0 0 0 3px ${accent}33 !important;
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${P.deepRed}; border-radius: 3px; }
        ::selection { background: ${P.midRed}; color: ${P.offWhite}; }
      `}</style>

      {/* Header */}
      <div style={{
        background: C.headerBg,
        borderBottom: `1px solid ${C.headerBorder}`,
        padding: isMobile ? "0 14px" : "0 28px",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, minWidth: 0 }}>
          {/* Hamburger on mobile */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{ background: "none", border: "none", color: C.headerText, cursor: "pointer", fontSize: 20, padding: "4px 2px", flexShrink: 0 }}>
              ☰
            </button>
          )}
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, letterSpacing: "-.5px", color: C.headerText, flexShrink: 0 }}>
            Resume
            <span style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
              color: P.white,
              padding: "2px 9px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              marginLeft: 4,
            }}>Builder</span>
          </div>
          <span style={{ fontSize: 12, color: C.headerFaint, display: isMobile ? "none" : "inline" }}>Build your perfect resume with AI</span>
          <span style={{ fontSize: 11, color: C.headerFaint, marginLeft: "auto", opacity: 0.6, display: isMobile ? "none" : "inline" }}>👥 {visitorCount} visits</span>
        </div>
        <div style={{ display: "flex", gap: isMobile ? 6 : 10, alignItems: "center", flexShrink: 0 }}>
          {/* Preview toggle on mobile */}
          {isMobile && (
            <button
              onClick={() => setShowPreview(p => !p)}
              style={{ padding: "7px 10px", border: `1px solid rgba(177,167,166,.18)`, background: showPreview ? `${accent}33` : `rgba(255,255,255,.08)`, borderRadius: 7, cursor: "pointer", color: showPreview ? accent : P.lightGray, fontSize: 12, fontWeight: 600 }}>
              {showPreview ? "✏️ Edit" : "👁 Preview"}
            </button>
          )}
          <button
            onClick={() => setTemplateOpen(true)}
            style={{
              padding: isMobile ? "7px 8px" : "8px 14px",
              border: `1px solid rgba(177,167,166,.18)`,
              background: `rgba(255,255,255,.08)`,
              borderRadius: 7,
              cursor: "pointer",
              color: P.lightGray,
              fontSize: isMobile ? 11 : 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all .15s",
            }}>
            <span style={{ width: 10, height: 10, borderRadius: 50, background: accent, display: "inline-block", flexShrink: 0 }} />
            {isMobile ? "" : currentTemplate.name}
          </button>
          <button style={btnPrimary} onClick={() => setExportOpen(true)}>↓ {isMobile ? "" : "Export"}</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Mobile sidebar overlay backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 200 }}
          />
        )}

        {/* Sidebar */}
        <div style={{
          width: 240,
          background: C.sidebarBg,
          borderRight: `1px solid ${C.sidebarBorder}`,
          overflowY: "auto",
          padding: "24px 0",
          flexShrink: 0,
          // Mobile: slide-over panel
          ...(isMobile ? {
            position: "fixed",
            top: 60,
            left: 0,
            bottom: 0,
            zIndex: 300,
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform .25s ease",
          } : {}),
        }}>
          <div style={{ padding: "0 16px", marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.4, color: C.sidebarFaint, marginBottom: 8 }}>Build Your Resume</div>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => { setSection(s.id); if (isMobile) setSidebarOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "9px 12px",
                  background: section === s.id ? `${accent}15` : "none",
                  border: "none",
                  borderLeft: `3px solid ${section === s.id ? accent : "transparent"}`,
                  color: section === s.id ? accent : C.sidebarText,
                  fontSize: 13,
                  fontWeight: section === s.id ? 700 : 400,
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: "0 7px 7px 0",
                  marginBottom: 2,
                  transition: "all .15s",
                }}>
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
          <div style={{ height: 1, background: C.sidebarBorder, margin: "16px 0" }} />
          <div style={{ padding: "0 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.4, color: C.sidebarFaint, marginBottom: 8 }}>Tools</div>
            {[
              { label: "📋 Load Sample Data", action: () => { setResume(TEMPLATE); toast("Sample data loaded!"); } },
              { label: "🗑️ Clear All Data", action: () => { if (confirm("Clear all? Cannot be undone.")) { setResume(EMPTY_RESUME); toast("Cleared."); } } },
            ].map(b => (
              <button
                key={b.label}
                onClick={b.action}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "9px 12px",
                  background: "none",
                  border: "none",
                  borderLeft: "3px solid transparent",
                  color: C.sidebarText,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: "0 7px 7px 0",
                  marginBottom: 2,
                  transition: "all .15s",
                }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main + Preview */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}>
          {/* Editor panel — hidden on mobile when preview is shown */}
          <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 16 : 28, maxWidth: isMobile ? "100%" : 700, minWidth: 0, display: (isMobile && showPreview) ? "none" : "block" }}>{renderSection()}</div>

          {/* Live Preview — always in DOM for PDF export */}
          <div data-preview-panel style={{
              width: isMobile ? "100%" : 400,
              borderLeft: isMobile ? "none" : `1px solid ${C.border}`,
              overflowY: "auto",
              padding: isMobile ? 12 : 20,
              flexShrink: 0,
              background: C.previewBg,
              // On mobile: show only when toggled. On tablet/desktop: always show
              display: isMobile ? (showPreview ? "block" : "none") : "block",
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.faint }}>Live Preview</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 50, background: accent, display: "inline-block" }} />
                <span style={{ fontSize: 11, color: C.faint }}>{currentTemplate.name}</span>
              </div>
            </div>
            <div
              className="resume-preview"
              style={{ background: P.white, borderRadius: 10, padding: isMobile ? 14 : 24, border: "1px solid rgba(0,0,0,.10)", fontSize: 11, color: P.black }}
              dangerouslySetInnerHTML={{ __html: previewHTML() }}
            />

            {/* Download bar — only shown on mobile preview */}
            {isMobile && showPreview && (
              <div style={{ display: "flex", gap: 10, marginTop: 16, paddingBottom: 8 }}>
                <button
                  onClick={exportPDF}
                  style={{ flex: 1, padding: "12px 0", background: accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  ⬇ Download PDF
                </button>
                <button
                  onClick={exportWord}
                  style={{ flex: 1, padding: "12px 0", background: C.elevated, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  📋 Word
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Picker Modal */}
      {templateOpen && (
        <div
          onClick={() => setTemplateOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(11,9,10,.87)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, width: isMobile ? "95vw" : 560, overflow: "hidden", animation: "slideUp .25s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>Choose a Template</div>
                <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>Pick a style for your resume</div>
              </div>
              <button onClick={() => setTemplateOpen(false)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: isMobile ? 14 : 24, display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
              {RESUME_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTemplate(t.id); setTemplateOpen(false); toast(`${t.name} applied!`); }}
                  style={{
                    background: activeTemplate === t.id ? `${accent}18` : C.elevated,
                    border: `2px solid ${activeTemplate === t.id ? accent : C.border}`,
                    borderRadius: 12,
                    padding: 14,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all .15s",
                  }}>
                  {/* Mini preview swatch */}
                  <div style={{ background: P.white, borderRadius: 6, padding: 8, marginBottom: 10, height: 80, overflow: "hidden", position: "relative" }}>
                    <div style={{ height: 10, background: t.accent, borderRadius: 3, marginBottom: 6, width: "70%" }} />
                    <div style={{ height: 5, background: P.lightGray, borderRadius: 2, marginBottom: 3, width: "90%" }} />
                    <div style={{ height: 5, background: P.lightGray, borderRadius: 2, marginBottom: 6, width: "60%" }} />
                    <div style={{ height: 4, background: t.accent, borderRadius: 2, marginBottom: 4, width: "40%", opacity: 0.5 }} />
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {[40, 55, 35].map((w, i) => <div key={i} style={{ height: 8, width: w, background: t.preview.tag, borderRadius: 3 }} />)}
                    </div>
                    {(t.id === "slate" || t.id === "elegant") && (
                      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                        <div style={{ width: t.id === "elegant" ? "62%" : "38%", background: t.id === "elegant" ? "#fef9f0" : t.accent, borderRadius: "6px 0 0 6px", opacity: 0.9, borderRight: t.id === "elegant" ? `3px solid ${t.accent}` : "none" }} />
                      </div>
                    )}
                    {t.id === "executive" && (
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28, background: t.accent, borderRadius: "6px 6px 0 0" }} />
                    )}
                    {(t.id === "teal" || t.id === "sunset") && (
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 24, background: t.accent, borderRadius: "6px 6px 0 0", opacity: 0.9 }} />
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2 }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: C.faint }}>{t.desc}</div>
                  {activeTemplate === t.id && <div style={{ fontSize: 10, color: accent, fontWeight: 700, marginTop: 4 }}>✓ Active</div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportOpen && (
        <div
          onClick={() => setExportOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(11,9,10,.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, width: isMobile ? "95vw" : 440, overflow: "hidden", animation: "slideUp .25s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Export Resume</div>
              <button onClick={() => setExportOpen(false)} style={{ background: "none", border: "none", color: C.faint, cursor: "pointer", fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { icon: "📄", label: "Export as PDF", action: exportPDF },
                { icon: "📝", label: "Export as Text", action: exportText },
                { icon: "⚙️", label: "Export as JSON", action: exportJSON },
                { icon: "📋", label: "Export as Word", action: exportWord },
              ].map(b => (
                <button
                  key={b.label}
                  onClick={b.action}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 18, background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.muted, transition: "all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
                  <span style={{ fontSize: 24 }}>{b.icon}</span> {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
