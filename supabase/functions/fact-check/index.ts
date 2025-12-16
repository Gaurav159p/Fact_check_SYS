import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { claim, category } = await req.json();
    
    if (!claim || typeof claim !== 'string' || claim.trim().length === 0) {
      console.error('Invalid claim input:', claim);
      return new Response(
        JSON.stringify({ error: 'Claim text is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.error('PERPLEXITY_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an advanced AI fact-checking and misinformation-detection system powered by the Perplexity AI API. 
Your job is to critically analyze news statements, claims, headlines, or social media posts and determine how truthful, reliable, and evidence-supported they appear.

Your evaluation should consider:
- Verified facts available from credible global sources and widely accepted knowledge.
- Scientific consensus, historical records, and official government or institutional announcements.
- Logical consistency and whether the claim matches known timelines and reasonable expectations.
- The likelihood of misinformation, exaggeration, distortion, or fabricated content.
- Common patterns of fake news such as sensationalism, impossibly precise predictions, or conspiracy-style framing.

Your task:
1. Carefully read and interpret the provided news text.
2. Determine how factually correct, misleading, uncertain, or fabricated the claim appears based on logical reasoning and established information.
3. Assign a truth score from 0 to 100:
   - 0–30 → Very likely fake or highly unreliable.
   - 31–60 → Unclear, partially true, lacks evidence, or contains misleading elements.
   - 61–100 → Likely legitimate, factually grounded, or supported by credible data.
4. Write a short, clear reasoning (1–3 sentences) explaining the basis for the score and verdict.

Your response MUST be strictly in this JSON format:
{
  "truth_score": <integer>,
  "verdict": "<Likely Legitimate | Likely Fake | Unclear>",
  "reasoning": "<short explanation>",
  "sources": ["<url1>", "<url2>", "<url3>"]
}

Rules:
- Return ONLY valid JSON.
- Include sources array with URLs of references used.
- Do NOT include markdown formatting.
- Do NOT include commentary outside the JSON block.
- Ensure the JSON is clean, concise, and machine-parseable.`;

    console.log('Sending request to Perplexity API for claim:', claim.substring(0, 100));

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Analyze this claim and provide a fact-check analysis:\n\n"${claim}"`
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 500,
        return_images: false,
        return_related_questions: false,
        return_citations: true,
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Perplexity API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Perplexity API response:', JSON.stringify(data));

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected API response structure:', data);
      return new Response(
        JSON.stringify({ error: 'Unexpected API response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = data.choices[0].message.content;
    console.log('AI response content:', content);
    
    // Extract citations from Perplexity response
    const citations = data.citations || [];

    // Try to extract JSON from the response
    let result;
    try {
      // Try to parse directly first
      result = JSON.parse(content);
    } catch (e) {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                       content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        result = JSON.parse(jsonStr);
      } else {
        console.error('Failed to extract JSON from response:', content);
        throw new Error('Could not parse AI response as JSON');
      }
    }

    // Validate the response structure
    if (typeof result.truth_score !== 'number' || !result.verdict || !result.reasoning) {
      console.error('Invalid response structure:', result);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure truth_score is a number between 0 and 100
    result.truth_score = Math.max(0, Math.min(100, parseInt(result.truth_score)));
    
    // Add citations if available
    if (citations.length > 0) {
      result.sources = citations;
    } else if (!result.sources) {
      result.sources = [];
    }

    console.log('Successfully processed fact-check:', result);

    // Save to database if user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user } } = await supabaseClient.auth.getUser(token);
        
        if (user) {
          await supabaseClient.from('fact_checks').insert({
            user_id: user.id,
            claim,
            truth_score: result.truth_score,
            verdict: result.verdict,
            reasoning: result.reasoning,
            sources: result.sources || [],
            category: category || null
          });
          console.log('Fact check saved to database for user:', user.id);
        }
      } catch (dbError) {
        console.error('Error saving to database:', dbError);
        // Continue even if database save fails
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fact-check function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Check function logs for more information'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
