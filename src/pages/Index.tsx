import { useState } from "react";
import { FactCheckHero } from "@/components/FactCheckHero";
import { FactCheckResults } from "@/components/FactCheckResults";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FactCheckResult {
  truth_score: number;
  verdict: string;
  reasoning: string;
  sources?: string[];
  id?: string;
  share_token?: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [currentClaim, setCurrentClaim] = useState("");

  const handleFactCheck = async (claim: string, category?: string) => {
    setIsLoading(true);
    setCurrentClaim(claim);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('fact-check', {
        body: { claim, category }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Failed to analyze claim. Please try again.');
        return;
      }

      if (data.error) {
        console.error('API error:', data.error);
        toast.error(data.error);
        return;
      }

      setResult(data);
      toast.success('Analysis complete!');
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Header />
      <FactCheckHero onSubmit={handleFactCheck} isLoading={isLoading} />
      <FactCheckResults result={result} claim={currentClaim} />
    </div>
  );
};

export default Index;
