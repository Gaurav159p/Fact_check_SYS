-- Add DELETE policy for fact_checks table
CREATE POLICY "Users can delete their own fact checks"
ON public.fact_checks
FOR DELETE
USING (auth.uid() = user_id);