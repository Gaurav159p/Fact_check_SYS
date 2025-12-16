-- Add new columns to fact_checks table for enhanced features
ALTER TABLE public.fact_checks
ADD COLUMN sources jsonb DEFAULT '[]'::jsonb,
ADD COLUMN category text,
ADD COLUMN bookmarked boolean DEFAULT false,
ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN share_token text UNIQUE DEFAULT encode(gen_random_uuid()::text::bytea, 'base64');

-- Create index for share tokens
CREATE INDEX idx_fact_checks_share_token ON public.fact_checks(share_token);

-- Create index for categories
CREATE INDEX idx_fact_checks_category ON public.fact_checks(category);

-- Create index for bookmarked items
CREATE INDEX idx_fact_checks_bookmarked ON public.fact_checks(user_id, bookmarked) WHERE bookmarked = true;

-- Add RLS policy for public access via share token
CREATE POLICY "Anyone can view fact checks via share token"
ON public.fact_checks
FOR SELECT
USING (share_token IS NOT NULL);

-- Add UPDATE policy so users can update their own fact checks (for bookmarking and rating)
CREATE POLICY "Users can update their own fact checks"
ON public.fact_checks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);