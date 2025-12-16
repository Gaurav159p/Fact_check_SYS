import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, CheckCircle2, Target, Calendar } from "lucide-react";

interface AnalyticsData {
  totalChecks: number;
  verdictDistribution: Array<{ name: string; value: number; color: string }>;
  categoryDistribution: Array<{ name: string; value: number }>;
  activityOverTime: Array<{ date: string; checks: number }>;
}

export const ProfileAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: factChecks, error } = await supabase
        .from("fact_checks")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!factChecks) return;

      // Verdict distribution
      const verdictCounts: Record<string, number> = {};
      factChecks.forEach(fc => {
        verdictCounts[fc.verdict] = (verdictCounts[fc.verdict] || 0) + 1;
      });

      const verdictColors: Record<string, string> = {
        "Likely Legitimate": "hsl(var(--chart-1))",
        "Likely Fake": "hsl(var(--chart-2))",
        "Unclear": "hsl(var(--chart-3))",
      };

      const verdictDistribution = Object.entries(verdictCounts).map(([name, value]) => ({
        name,
        value,
        color: verdictColors[name] || "hsl(var(--chart-4))",
      }));

      // Category distribution
      const categoryCounts: Record<string, number> = {};
      factChecks.forEach(fc => {
        if (fc.category) {
          categoryCounts[fc.category] = (categoryCounts[fc.category] || 0) + 1;
        }
      });

      const categoryDistribution = Object.entries(categoryCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Activity over time (last 7 days)
      const today = new Date();
      const activityOverTime = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        
        const count = factChecks.filter(fc => {
          const fcDate = new Date(fc.created_at).toISOString().split("T")[0];
          return fcDate === dateStr;
        }).length;
        
        activityOverTime.push({
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          checks: count,
        });
      }

      setAnalytics({
        totalChecks: factChecks.length,
        verdictDistribution,
        categoryDistribution,
        activityOverTime,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const avgTruthScore = analytics.totalChecks > 0 
    ? Math.round(analytics.verdictDistribution.reduce((acc, curr) => {
        if (curr.name === "Likely Legitimate") return acc + (curr.value * 85);
        if (curr.name === "Likely Fake") return acc + (curr.value * 25);
        return acc + (curr.value * 50);
      }, 0) / analytics.totalChecks)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Analytics Dashboard
          </CardTitle>
          <CardDescription>Your fact-checking activity and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Checks</p>
              </div>
              <p className="text-3xl font-bold">{analytics.totalChecks}</p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Avg Truth Score</p>
              </div>
              <p className="text-3xl font-bold">{avgTruthScore}%</p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
              <p className="text-3xl font-bold">
                {analytics.activityOverTime.reduce((sum, day) => sum + day.checks, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Verdict Distribution</CardTitle>
            <CardDescription>Breakdown of your fact-check results</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.verdictDistribution.length > 0 ? (
              <ChartContainer config={{
                value: { label: "Count", color: "hsl(var(--chart-1))" }
              } satisfies ChartConfig} className="h-[250px]">
                <PieChart>
                  <Pie
                    data={analytics.verdictDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.verdictDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trending Topics</CardTitle>
            <CardDescription>Your most checked categories</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.categoryDistribution.length > 0 ? (
              <ChartContainer config={{
                value: { label: "Checks", color: "hsl(var(--primary))" }
              } satisfies ChartConfig} className="h-[250px]">
                <BarChart data={analytics.categoryDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No categories yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Over Time</CardTitle>
          <CardDescription>Your fact-checking activity for the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{
            checks: { label: "Fact Checks", color: "hsl(var(--primary))" }
          } satisfies ChartConfig} className="h-[250px]">
            <LineChart data={analytics.activityOverTime}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="checks" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
                name="Fact Checks"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
