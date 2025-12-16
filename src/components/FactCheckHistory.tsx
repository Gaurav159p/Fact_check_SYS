import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { History, Trash2, Bookmark, Star, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FactCheck {
  id: string;
  claim: string;
  truth_score: number;
  verdict: string;
  reasoning: string;
  created_at: string;
  category: string | null;
  bookmarked: boolean;
  rating: number | null;
}

export const FactCheckHistory = () => {
  const [history, setHistory] = useState<FactCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterBookmarked, setFilterBookmarked] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [filterCategory, filterBookmarked]);

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let query = supabase
        .from("fact_checks")
        .select("*")
        .eq("user_id", session.user.id);

      if (filterCategory !== "all") {
        query = query.eq('category', filterCategory);
      }

      if (filterBookmarked) {
        query = query.eq('bookmarked', true);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fact_checks")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setHistory(history.filter(check => check.id !== id));
      toast.success("Fact-check deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete fact-check");
      console.error("Error deleting fact-check:", error);
    }
  };

  const getVerdictColor = (verdict: string) => {
    if (verdict === "Likely Legitimate") return "bg-green-500/10 text-green-700 dark:text-green-400";
    if (verdict === "Likely Fake") return "bg-red-500/10 text-red-700 dark:text-red-400";
    return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading history...
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Fact-Check History
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          No fact-checks yet. Start by checking a claim!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Fact-Check History ({history.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
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
            <Button
              variant={filterBookmarked ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterBookmarked(!filterBookmarked)}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Bookmarked
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {history.map((check) => (
              <Card key={check.id} className="border-muted">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm flex-1">{check.claim}</p>
                        {check.bookmarked && (
                          <Bookmark className="h-4 w-4 fill-current text-primary" />
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-2">
                        <Badge variant="outline" className={getVerdictColor(check.verdict)}>
                          {check.verdict}
                        </Badge>
                        {check.category && (
                          <Badge variant="outline" className="text-xs">
                            {check.category}
                          </Badge>
                        )}
                        {check.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-muted-foreground">{check.rating}/5</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete fact-check?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this fact-check from your history.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(check.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Truth Score:</span>
                    <span className={`font-bold ${getScoreColor(check.truth_score)}`}>
                      {check.truth_score}%
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">{check.reasoning}</p>
                  
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(check.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
