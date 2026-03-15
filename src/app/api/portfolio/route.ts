import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const StockSchema = z.object({
  ticker: z.string().min(1).max(10),
  companyName: z.string().min(1),
  shares: z.number().positive(),
  purchasePrice: z.number().positive(),
  currentPrice: z.number().positive(),
});

const PortfolioSchema = z.object({
  stocks: z.array(StockSchema).min(1),
  riskTolerance: z.enum(["low", "medium", "high"]),
  investmentHorizon: z.enum(["short", "medium", "long"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stocks, riskTolerance, investmentHorizon } =
      PortfolioSchema.parse(body);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured." },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const totalValue = stocks.reduce(
      (sum, s) => sum + s.shares * s.currentPrice,
      0
    );

    const portfolioSummary = stocks
      .map((s) => {
        const currentValue = s.shares * s.currentPrice;
        const costBasis = s.shares * s.purchasePrice;
        const gainLoss = currentValue - costBasis;
        const gainLossPct = ((gainLoss / costBasis) * 100).toFixed(2);
        const portfolioWeight = ((currentValue / totalValue) * 100).toFixed(2);
        return `- ${s.ticker} (${s.companyName}): ${s.shares} shares @ $${s.currentPrice} (purchased @ $${s.purchasePrice}), current value $${currentValue.toFixed(2)}, P&L: ${gainLoss >= 0 ? "+" : ""}$${gainLoss.toFixed(2)} (${gainLossPct}%), portfolio weight: ${portfolioWeight}%`;
      })
      .join("\n");

    const prompt = `You are a seasoned financial advisor. Analyze the following stock portfolio and provide actionable feedback.

Portfolio Details:
${portfolioSummary}

Total Portfolio Value: $${totalValue.toFixed(2)}
Risk Tolerance: ${riskTolerance}
Investment Horizon: ${investmentHorizon}-term

Please provide a structured analysis with the following sections:

1. **Portfolio Overview** – Brief summary of the portfolio composition, diversification, and overall performance.

2. **Individual Stock Feedback** – For each stock, comment on its performance, risk, and whether to hold, buy more, or consider selling.

3. **Buy Recommendations** – Suggest 3-5 specific stocks (with tickers) to consider buying based on the portfolio's gaps, the investor's risk tolerance, and investment horizon. For each suggestion explain:
   - Why to buy
   - Suggested entry timing (e.g., on a pullback, now, wait for earnings)
   - Target allocation percentage

4. **Portfolio Improvements** – Suggest rebalancing actions or sectors to add/reduce.

5. **Risk Assessment** – Identify concentration risks, sector risks, and overall portfolio volatility profile.

Keep the tone professional but accessible. Use markdown formatting for clarity.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const analysis = completion.choices[0]?.message?.content ?? "";

    return NextResponse.json({ analysis });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid portfolio data.", details: err.errors },
        { status: 400 }
      );
    }
    console.error("Portfolio analysis error:", err);
    return NextResponse.json(
      { error: "Failed to analyze portfolio. Please try again." },
      { status: 500 }
    );
  }
}
