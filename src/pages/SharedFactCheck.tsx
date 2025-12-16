import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { AlertTriangle, CheckCircle, HelpCircle, Shield, ExternalLink, Home } from "lucide-react";
import { toast } from "sonner";

interface FactCheck {
  id: string;
  claim: string;
  truth_score: number;
  verdict: string;
  reasoning: string;
  sources: any;
  category: string | null;
  created_at: string;
}

const SharedFactCheck = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [factCheck, setFactCheck] = useState<FactCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFactCheck();
  }, [shareToken]);

  const fetchFactCheck = async () => {
    if (!shareToken) {
      toast.error("Invalid share link");
      navigate("/");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("fact_checks")
        .select("*")
        .eq("share_token", shareToken)
        .single();

      if (error) throw error;

      setFactCheck({
        ...data,
        sources: Array.isArray(data.sources) ? data.sources : []
      });
    } catch (error) {
      console.error("Error fetching shared fact check:", error);
      toast.error("Failed to load fact check");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!factCheck) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Fact check not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Header />
      <section className="w-full py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Shared Fact Check</h1>
            <Button variant="outline" onClick={() => navigate("/")}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>

          <Card className="p-6 border-2 shadow-xl">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">Analyzed Claim</h2>
                    {factCheck.category && (
                      <Badge variant="outline">{factCheck.category}</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground italic">"{factCheck.claim}"</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">Truth Score</h3>
                  <span className={`text-4xl font-bold ${getScoreColor(factCheck.truth_score)}`}>
                    {factCheck.truth_score}/100
                  </span>
                </div>
                <Progress 
                  value={factCheck.truth_score} 
                  className="h-3"
                  indicatorClassName={getProgressColor(factCheck.truth_score)}
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
                    variant={getVerdictColor(factCheck.verdict) as any}
                    className="text-sm py-2 px-4"
                  >
                    {getVerdictIcon(factCheck.verdict)}
                    <span className="ml-2">{factCheck.verdict}</span>
                  </Badge>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Analysis</h4>
                  <p className="text-foreground leading-relaxed">{factCheck.reasoning}</p>
                </div>
              </div>

              {factCheck.sources && factCheck.sources.length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-3 flex items-center">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Sources & References
                  </h4>
                  <div className="space-y-2">
                    {factCheck.sources.map((source, index) => (
                      <a
                        key={index}
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start space-x-2 text-sm text-primary hover:underline p-2 rounded hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-muted-foreground">[{index + 1}]</span>
                        <span className="break-all">{source}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> This analysis is generated by AI and should be used as a starting point for further research. 
                    Always verify important claims through multiple credible sources.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default SharedFactCheck;
