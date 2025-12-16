// import { useState } from "react";


// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { Card } from "@/components/ui/card";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Shield, Sparkles } from "lucide-react";
// import { toast } from "sonner";

// interface FactCheckHeroProps {
//   onSubmit: (claim: string, category?: string) => void;
//   isLoading: boolean;
// }

// export const FactCheckHero = ({ onSubmit, isLoading }: FactCheckHeroProps) => {
//   const [claim, setClaim] = useState("");
//   const [category, setCategory] = useState<string>("");
//   const [pdfFile, setPdfFile] = useState<File | null>(null);
//   const [extracting, setExtracting] = useState(false);
//   const [useLocalWorker, setUseLocalWorker] = useState(false);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (claim.trim()) {
//       onSubmit(claim.trim(), category || undefined);
//     }
//   };

//   const handlePdfSelect = (file?: File) => {
//     if (!file) {
//       setPdfFile(null);
//       return;
//     }
//     setPdfFile(file);
//   };

//   const extractPdfText = async () => {
//     if (!pdfFile) {
//       toast.error('No PDF selected');
//       return;
//     }

//     setExtracting(true);

//     try {
//       const arrayBuffer = await pdfFile.arrayBuffer();
//       console.debug('[PDF] arrayBuffer length', arrayBuffer.byteLength);

//       // dynamic import of the pdfjs legacy build (preferred)
//       let pdfjsLib: any;
//       // helper: fetch a worker URL and return an object URL (blob) to avoid module import issues
//       const fetchWorkerToObjectUrl = async (url: string) => {
//         try {
//           console.debug('[PDF] fetching worker from', url);
//           const resp = await fetch(url);
//           if (!resp.ok) throw new Error('Worker fetch failed: ' + resp.status);
//           const blob = await resp.blob();
//           const objUrl = URL.createObjectURL(blob);
//           console.debug('[PDF] created object URL for worker');
//           return objUrl;
//         } catch (err) {
//           console.warn('[PDF] failed to fetch worker and create blob URL', err);
//           return null;
//         }
//       };

//       try {
//         // @ts-ignore
//         pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');

//         // Resolve source (local or CDN) then attempt to fetch and convert to blob URL
//         const candidate = useLocalWorker ? '/pdf.worker.min.js' : 'https://unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.js';
//         let workerSrc = await fetchWorkerToObjectUrl(candidate);
//         if (!workerSrc) {
//           console.debug('[PDF] falling back to direct worker URL', candidate);
//           workerSrc = candidate;
//         }
//         (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;
//         console.debug('[PDF] workerSrc set to', workerSrc);
//       } catch (primaryErr) {
//         console.warn('Failed to import pdfjs-dist legacy build, trying package root', primaryErr);
//         // @ts-ignore
//         pdfjsLib = await import('pdfjs-dist');
//         const candidate = useLocalWorker ? '/pdf.worker.min.js' : 'https://unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.js';
//         let workerSrc = await fetchWorkerToObjectUrl(candidate);
//         if (!workerSrc) workerSrc = candidate;
//         (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;
//         console.debug('[PDF] fallback to package root; worker set to', workerSrc);
//       }

//       console.debug('[PDF] initializing pdf document');
//       const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
//       const pdf = await loadingTask.promise;
//       console.debug('[PDF] document loaded, numPages=', pdf.numPages);
//       let fullText = '';

//       for (let i = 1; i <= pdf.numPages; i++) {
//         const page = await pdf.getPage(i);
//         try {
//           const content = await page.getTextContent();
//           console.debug(`[PDF] page ${i} text items:`, content.items.length);
//           const strings = content.items.map((s: any) => s.str || '').filter(Boolean);
//           if (strings.length) {
//             fullText += strings.join(' ') + '\n\n';
//           } else {
//             console.debug(`[PDF] page ${i} had no selectable text items`);
//           }
//         } catch (pageTextErr) {
//           console.error(`[PDF] failed to getTextContent for page ${i}`, pageTextErr);
//         }
//       }

//       let cleaned = fullText.trim();

//       if (!cleaned) {
//         toast('No selectable text found — attempting OCR fallback (this may take a while)...');

//         // Dynamically import the browser-ready Tesseract bundle for OCR fallback
//         // @ts-ignore
//         let Tesseract: any;
//         try {
//           Tesseract = await import('tesseract.js/dist/tesseract.min.js');
//           console.debug('[OCR] tesseract imported');
//         } catch (tessErr) {
//           console.error('[OCR] failed to import tesseract bundle', tessErr);
//           toast.error('OCR library failed to load — see console for details');
//           throw tessErr;
//         }

//         let ocrText = '';

//         for (let i = 1; i <= pdf.numPages; i++) {
//           const page = await pdf.getPage(i);
//           const viewport = page.getViewport({ scale: 2 });

//           const canvas = document.createElement('canvas');
//           canvas.width = Math.round(viewport.width);
//           canvas.height = Math.round(viewport.height);
//           const ctx = canvas.getContext('2d');
//           if (!ctx) continue;

//           await page.render({ canvasContext: ctx, viewport }).promise;

//           try {
//             console.debug(`[OCR] recognizing page ${i}...`);
//             const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
//             console.debug(`[OCR] page ${i} recognized text length`, text?.length || 0);
//             ocrText += text + '\n\n';
//           } catch (ocrErr) {
//             console.error('OCR error on page', i, ocrErr);
//           }
//         }

//         cleaned = ocrText.trim();

//         if (!cleaned) {
//           toast.error('No extractable text found in PDF and OCR fallback produced no text');
//         } else {
//           setClaim(cleaned);
//           toast.success('OCR completed and text populated');
//         }
//       } else {
//         setClaim(cleaned);
//         toast.success('PDF text extracted into the input');
//       }
//     } catch (err) {
//       console.error('PDF extraction failed — full error:', err);
//       // Provide a bit more actionable message to the user
//       toast.error('Failed to extract text from PDF. Check console for details and try the fallback option.');
//     } finally {
//       setExtracting(false);
//     }
//   };

//   return (
//     <section className="w-full py-16 px-4 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
//       <div className="max-w-4xl mx-auto space-y-8">
//         <div className="text-center space-y-4">
//           <div className="flex items-center justify-center mb-6">
//             <div className="bg-gradient-to-br from-primary to-accent p-4 rounded-2xl">
//               <Shield className="w-12 h-12 text-white" />
//             </div>
//           </div>
//           <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
//             AI Fact Checker
//           </h1>
//           <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
//             Detect misinformation instantly with AI-powered analysis. Paste any claim, headline, or news statement below.
//           </p>
//         </div>

//         <Card className="p-6 shadow-xl border-2">
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div className="space-y-2">
//               <label className="text-sm font-medium text-foreground">Or upload a PDF</label>
//               <div className="flex items-center space-x-3">
//                 <input
//                   type="file"
//                   accept="application/pdf"
//                   onChange={(e) => handlePdfSelect(e.target.files?.[0])}
//                   className="text-sm"
//                   disabled={isLoading}
//                 />
//                 <Button variant="outline" size="sm" onClick={extractPdfText} disabled={!pdfFile || extracting || isLoading}>
//                   {extracting ? 'Extracting...' : 'Extract & Fill'}
//                 </Button>
//               </div>
//               <div className="flex items-center space-x-2 mt-2">
//                 <input
//                   id="use-local-worker"
//                   type="checkbox"
//                   checked={useLocalWorker}
//                   onChange={(e) => setUseLocalWorker(e.target.checked)}
//                   className="w-4 h-4"
//                 />
//                 <label htmlFor="use-local-worker" className="text-xs text-muted-foreground">
//                   Use local PDF worker (run `npm run setup:pdf-worker` first)
//                 </label>
//               </div>
//             </div>

//             <div className="space-y-2">
//               <label htmlFor="claim-input" className="text-sm font-medium text-foreground">
//                 Enter claim or statement to verify
//               </label>
//               <Textarea
//                 id="claim-input"
//                 value={claim}
//                 onChange={(e) => setClaim(e.target.value)}
//                 placeholder="Example: 'Scientists discover cure for all cancers in 2025' or paste any news headline..."
//                 className="min-h-[120px] resize-none text-base"
//                 disabled={isLoading}
//               />
//             </div>
//             <div className="space-y-2">
//               <label htmlFor="category-select" className="text-sm font-medium text-foreground">
//                 Category (Optional)
//               </label>
//               <Select value={category} onValueChange={setCategory} disabled={isLoading}>
//                 <SelectTrigger id="category-select">
//                   <SelectValue placeholder="Select a category..." />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="Politics">Politics</SelectItem>
//                   <SelectItem value="Health">Health</SelectItem>
//                   <SelectItem value="Science">Science</SelectItem>
//                   <SelectItem value="Technology">Technology</SelectItem>
//                   <SelectItem value="Business">Business</SelectItem>
//                   <SelectItem value="Entertainment">Entertainment</SelectItem>
//                   <SelectItem value="Sports">Sports</SelectItem>
//                   <SelectItem value="Other">Other</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <Button 
//               type="submit" 
//               size="lg"
//               className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
//               disabled={!claim.trim() || isLoading}
//             >
//               {isLoading ? (
//                 <>
//                   <Sparkles className="w-5 h-5 mr-2 animate-spin" />
//                   Analyzing...
//                 </>
//               ) : (
//                 <>
//                   <Shield className="w-5 h-5 mr-2" />
//                   Check Facts
//                 </>
//               )}
//             </Button>
//           </form>
//         </Card>

//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
//           <Card className="p-4 bg-card/50 backdrop-blur">
//             <div className="flex items-start space-x-3">
//               <div className="bg-primary/10 p-2 rounded-lg">
//                 <Shield className="w-5 h-5 text-primary" />
//               </div>
//               <div>
//                 <h3 className="font-semibold text-sm">Real-Time Analysis</h3>
//                 <p className="text-xs text-muted-foreground mt-1">
//                   Powered by Perplexity AI for current information
//                 </p>
//               </div>
//             </div>
//           </Card>
//           <Card className="p-4 bg-card/50 backdrop-blur">
//             <div className="flex items-start space-x-3">
//               <div className="bg-accent/10 p-2 rounded-lg">
//                 <Sparkles className="w-5 h-5 text-accent" />
//               </div>
//               <div>
//                 <h3 className="font-semibold text-sm">Evidence-Based</h3>
//                 <p className="text-xs text-muted-foreground mt-1">
//                   Cross-references credible sources and data
//                 </p>
//               </div>
//             </div>
//           </Card>
//           <Card className="p-4 bg-card/50 backdrop-blur">
//             <div className="flex items-start space-x-3">
//               <div className="bg-success/10 p-2 rounded-lg">
//                 <Shield className="w-5 h-5 text-success" />
//               </div>
//               <div>
//                 <h3 className="font-semibold text-sm">Instant Results</h3>
//                 <p className="text-xs text-muted-foreground mt-1">
//                   Get comprehensive verdicts in seconds
//                 </p>
//               </div>
//             </div>
//           </Card>
//         </div>
//       </div>
//     </section>
//   );
// };



import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";

// --- PDF.js imports (VITE-FRIENDLY) ---
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

interface FactCheckHeroProps {
  onSubmit: (claim: string, category?: string) => void;
  isLoading: boolean;
}

export const FactCheckHero = ({ onSubmit, isLoading }: FactCheckHeroProps) => {
  const [claim, setClaim] = useState("");
  const [category, setCategory] = useState<string>("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (claim.trim()) {
      onSubmit(claim.trim(), category || undefined);
    }
  };

  const handlePdfSelect = (file?: File) => {
    file ? setPdfFile(file) : setPdfFile(null);
  };

  // --- Working PDF text extraction ---
  const extractPdfText = async () => {
    if (!pdfFile) {
      toast.error("No PDF selected");
      return;
    }

    setExtracting(true);

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((s: any) => s.str || "").filter(Boolean);
        fullText += strings.join(" ") + "\n\n";
      }

      const cleaned = fullText.trim();

      if (!cleaned) {
        toast.error("No extractable text found in PDF");
      } else {
        setClaim(cleaned);
        toast.success("PDF text extracted successfully");
      }
    } catch (err) {
      console.error("PDF extraction failed", err);
      toast.error("Failed to extract PDF text");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <section className="w-full py-16 px-4 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-br from-primary to-accent p-4 rounded-2xl">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI Fact Checker
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Detect misinformation instantly with AI-powered analysis. Paste any claim, headline, or news statement below.
          </p>
        </div>

        <Card className="p-6 shadow-xl border-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* PDF Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Upload a PDF</label>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handlePdfSelect(e.target.files?.[0])}
                  className="text-sm"
                  disabled={isLoading}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={extractPdfText}
                  disabled={!pdfFile || extracting || isLoading}
                >
                  {extracting ? "Extracting..." : "Extract & Fill"}
                </Button>
              </div>
            </div>

            {/* Claim Input */}
            <div className="space-y-2">
              <label htmlFor="claim-input" className="text-sm font-medium text-foreground">
                Enter claim or statement to verify
              </label>
              <Textarea
                id="claim-input"
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                placeholder="Example: 'Scientists discover cure for all cancers in 2025'..."
                className="min-h-[120px] resize-none text-base"
                disabled={isLoading}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label htmlFor="category-select" className="text-sm font-medium text-foreground">
                Category (Optional)
              </label>
              <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Politics">Politics</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Science">Science</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              disabled={!claim.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Check Facts
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Bottom Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
          <Card className="p-4 bg-card/50 backdrop-blur">
            <div className="flex items-start space-x-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Real-Time Analysis</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Powered by Perplexity AI for current information
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur">
            <div className="flex items-start space-x-3">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Evidence-Based</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Uses credible and verified sources
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur">
            <div className="flex items-start space-x-3">
              <div className="bg-success/10 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Instant Results</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Get verdicts in seconds
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
