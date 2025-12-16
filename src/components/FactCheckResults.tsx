import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, HelpCircle, Shield, Bookmark, Share2, Star, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";

interface FactCheckResult {
  truth_score: number;
  verdict: string;
  reasoning: string;
  sources?: string[];
  id?: string;
  share_token?: string;
  bookmarked?: boolean;
  rating?: number;
}

interface FactCheckResultsProps {
  result: FactCheckResult | null;
  claim: string;
  onUpdate?: () => void;
}

export const FactCheckResults = ({ result, claim, onUpdate }: FactCheckResultsProps) => {
  const [isBookmarked, setIsBookmarked] = useState(result?.bookmarked || false);
  const [rating, setRating] = useState(result?.rating || 0);
  const [factCheckId, setFactCheckId] = useState<string | null>(null);

  useEffect(() => {
    setIsBookmarked(result?.bookmarked || false);
    setRating(result?.rating || 0);
    fetchFactCheckId();
  }, [result]);

  const fetchFactCheckId = async () => {
    if (!result) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('fact_checks')
      .select('id')
      .eq('user_id', user.id)
      .eq('claim', claim)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setFactCheckId(data.id);
    }
  };

  const handleBookmark = async () => {
    if (!factCheckId) {
      toast.error('Please sign in to bookmark');
      return;
    }

    const newBookmarkedState = !isBookmarked;
    const { error } = await supabase
      .from('fact_checks')
      .update({ bookmarked: newBookmarkedState })
      .eq('id', factCheckId);

    if (error) {
      toast.error('Failed to update bookmark');
      return;
    }

    setIsBookmarked(newBookmarkedState);
    toast.success(newBookmarkedState ? 'Bookmarked!' : 'Bookmark removed');
    onUpdate?.();
  };

  const handleRating = async (newRating: number) => {
    if (!factCheckId) {
      toast.error('Please sign in to rate');
      return;
    }

    const { error } = await supabase
      .from('fact_checks')
      .update({ rating: newRating })
      .eq('id', factCheckId);

    if (error) {
      toast.error('Failed to save rating');
      return;
    }

    setRating(newRating);
    toast.success('Rating saved!');
    onUpdate?.();
  };

  const handleShare = async () => {
    if (!result?.share_token && !factCheckId) {
      toast.error('Unable to generate share link');
      return;
    }

    let shareToken = result?.share_token;
    
    if (!shareToken && factCheckId) {
      const { data } = await supabase
        .from('fact_checks')
        .select('share_token')
        .eq('id', factCheckId)
        .single();
      
      shareToken = data?.share_token;
    }

    if (!shareToken) {
      toast.error('Unable to generate share link');
      return;
    }

    const shareUrl = `${window.location.origin}/shared/${shareToken}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  // Upload PDF as an additional source and save its public URL to the fact_checks.sources
  const [uploading, setUploading] = useState(false);
  const handlePdfUpload = async (file?: File) => {
    if (!file) return;
    if (!factCheckId) {
      toast.error('Please sign in to upload sources');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${factCheckId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Build public URL (bucket should be configured as public or adjust to use signed URL)
      const { data: publicData } = await supabase.storage.from('documents').getPublicUrl(fileName);
      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) throw new Error('Failed to obtain public URL for uploaded file');

      // Append to existing sources
      const updatedSources = Array.isArray(result?.sources) ? [...result!.sources, publicUrl] : [publicUrl];

      const { error: updateError } = await supabase
        .from('fact_checks')
        .update({ sources: updatedSources })
        .eq('id', factCheckId);

      if (updateError) throw updateError;

      toast.success('PDF uploaded and added to sources');
      onUpdate?.();
    } catch (err: any) {
      console.error('Upload failed', err);
      toast.error('Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  // Generate a PDF from the claim + analysis and upload it
  const generateAndUploadPdf = async () => {
    if (!result) return;
    if (!factCheckId) {
      toast.error('Please sign in to upload PDF');
      return;
    }

    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Claim:', 10, 20);
      doc.setFontSize(12);
      const claimLines = doc.splitTextToSize(claim, 180);
      doc.text(claimLines, 10, 30);

      doc.setFontSize(14);
      doc.text('Analysis:', 10, 60 + claimLines.length * 6);
      doc.setFontSize(12);
      const reasoningStartY = 70 + claimLines.length * 6;
      const reasoningLines = doc.splitTextToSize(result.reasoning || '', 180);
      doc.text(reasoningLines, 10, reasoningStartY);

      if (result.sources && result.sources.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Sources & References:', 10, 20);
        doc.setFontSize(10);
        result.sources.forEach((s, idx) => {
          const y = 30 + idx * 8;
          doc.text(`${idx + 1}. ${s}`, 10, y);
        });
      }

      const blob = doc.output('blob');
      const file = new File([blob], `${factCheckId}_analysis_${Date.now()}.pdf`, { type: 'application/pdf' });
      await handlePdfUpload(file);
    } catch (err) {
      console.error('PDF generation/upload failed', err);
      toast.error('Failed to create or upload PDF');
    }
  };

  if (!result) return null;

  const getVerdictColor = (verdict: string) => {
    if (verdict.toLowerCase().includes("legitimate")) return "success";
    if (verdict.toLowerCase().includes("fake")) return "destructive";
    return "warning";
  };

  const getVerdictIcon = (verdict: string) => {
    if (verdict.toLowerCase().includes("legitimate")) return <CheckCircle className="w-5 h-5" />;
    if (verdict.toLowerCase().includes("fake")) return <AlertTriangle className="w-5 h-5" />;
    return <HelpCircle className="w-5 h-5" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 61) return "text-success";
    if (score >= 31) return "text-warning";
    return "text-destructive";
  };

  const getProgressColor = (score: number) => {
    if (score >= 61) return "bg-success";
    if (score >= 31) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <section className="w-full py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6 border-2 shadow-xl">
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-primary/10 p-3 rounded-xl">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-2">Analyzed Claim</h2>
                <p className="text-muted-foreground italic">"{claim}"</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">Truth Score</h3>
                <span className={`text-4xl font-bold ${getScoreColor(result.truth_score)}`}>
                  {result.truth_score}/100
                </span>
              </div>
              <Progress 
                value={result.truth_score} 
                className="h-3"
                indicatorClassName={getProgressColor(result.truth_score)}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Likely Fake</span>
                <span>Unclear</span>
                <span>Likely Legitimate</span>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center space-x-3 mb-3">
                <Badge 
                  variant={getVerdictColor(result.verdict) as any}
                  className="text-sm py-2 px-4"
                >
                  {getVerdictIcon(result.verdict)}
                  <span className="ml-2">{result.verdict}</span>
                </Badge>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Analysis</h4>
                <p className="text-foreground leading-relaxed">{result.reasoning}</p>
              </div>
            </div>

            {result.sources && result.sources.length > 0 && (
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-3 flex items-center">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Sources & References
                </h4>
                <div className="space-y-2">
                  {result.sources.map((source, index) => {
                    const isPdf = /\.pdf($|\?)/i.test(source);
                    const rawName = source.split('/').pop() || source;
                    const fileName = decodeURIComponent(rawName.split('?')[0]);

                    return (
                      <div
                        key={index}
                        className="flex items-center space-x-2 text-sm text-primary p-2 rounded hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          {isPdf ? (
                            <FileText className="w-4 h-4 text-red-600" />
                          ) : (
                            <ExternalLink className="w-4 h-4" />
                          )}
                        </div>

                        <a
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all hover:underline"
                        >
                          {isPdf ? fileName : source}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBookmark}
                  className="flex items-center space-x-2"
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex items-center space-x-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Rate this analysis:</p>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold mb-3">Add PDF as Source</h4>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfUpload(file);
                  }}
                  className="text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateAndUploadPdf}
                  disabled={uploading}
                >
                  Save & upload PDF
                </Button>
                <span className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : ''}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Upload a PDF as a supporting source. Files are stored in your configured Supabase storage bucket.</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
