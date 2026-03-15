"use client";

import { useState } from "react";
import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Trash2,
  BarChart2,
  Loader2,
} from "lucide-react";

interface Stock {
  id: string;
  ticker: string;
  companyName: string;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
}

type RiskTolerance = "low" | "medium" | "high";
type InvestmentHorizon = "short" | "medium" | "long";

const MAX_TICKER_LENGTH = 10;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-to-JSX rendering for bold, headings, lists
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-800">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="text-xl font-bold text-gray-900 mt-4">
              {line.replace(/^## /, "")}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={i} className="text-lg font-semibold text-gray-900 mt-3">
              {line.replace(/^### /, "")}
            </h3>
          );
        }
        if (/^\*\*\d+\.\s/.test(line) || /^\*\*[A-Z]/.test(line)) {
          // Bold heading like **1. Portfolio Overview**
          const cleaned = line.replace(/\*\*(.*?)\*\*/g, "$1");
          return (
            <p key={i} className="font-semibold text-gray-900 mt-3">
              {cleaned}
            </p>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          const text = line.replace(/^[-*]\s/, "").replace(/\*\*(.*?)\*\*/g, "$1");
          return (
            <li key={i} className="ml-4 list-disc">
              {text}
            </li>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }
        // Inline bold
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                part
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function PortfolioPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [form, setForm] = useState({
    ticker: "",
    companyName: "",
    shares: "",
    purchasePrice: "",
    currentPrice: "",
  });
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>("medium");
  const [investmentHorizon, setInvestmentHorizon] =
    useState<InvestmentHorizon>("medium");
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const totalValue = stocks.reduce(
    (sum, s) => sum + s.shares * s.currentPrice,
    0
  );
  const totalCost = stocks.reduce(
    (sum, s) => sum + s.shares * s.purchasePrice,
    0
  );
  const totalGainLoss = totalValue - totalCost;

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function addStock() {
    const shares = parseFloat(form.shares);
    const purchasePrice = parseFloat(form.purchasePrice);
    const currentPrice = parseFloat(form.currentPrice);

    if (
      !form.ticker.trim() ||
      !form.companyName.trim() ||
      isNaN(shares) ||
      shares <= 0 ||
      isNaN(purchasePrice) ||
      purchasePrice <= 0 ||
      isNaN(currentPrice) ||
      currentPrice <= 0
    ) {
      setError("Please fill in all fields with valid values.");
      return;
    }

    setError("");
    setStocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ticker: form.ticker.trim().toUpperCase(),
        companyName: form.companyName.trim(),
        shares,
        purchasePrice,
        currentPrice,
      },
    ]);
    setForm({
      ticker: "",
      companyName: "",
      shares: "",
      purchasePrice: "",
      currentPrice: "",
    });
  }

  function removeStock(id: string) {
    setStocks((prev) => prev.filter((s) => s.id !== id));
  }

  async function analyzePortfolio() {
    if (stocks.length === 0) {
      setError("Please add at least one stock to your portfolio.");
      return;
    }
    setError("");
    setLoading(true);
    setAnalysis("");

    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stocks: stocks.map(({ ticker, companyName, shares, purchasePrice, currentPrice }) => ({
            ticker,
            companyName,
            shares,
            purchasePrice,
            currentPrice,
          })),
          riskTolerance,
          investmentHorizon,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Analysis failed.");
      }
      setAnalysis(data.analysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-slate-50 grainy-light min-h-screen py-10">
      <MaxWidthWrapper>
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Stock Portfolio Analyzer
          </h1>
          <p className="mt-2 text-gray-600 text-lg">
            Add your stock holdings and get AI-powered feedback with personalized
            buy recommendations.
          </p>
        </div>

        {/* Add Stock Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-green-600" />
              Add Stock
            </CardTitle>
            <CardDescription>
              Enter your stock details to build your portfolio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="ticker">Ticker</Label>
                <input
                  id="ticker"
                  name="ticker"
                  value={form.ticker}
                  onChange={handleFormChange}
                  placeholder="AAPL"
                  maxLength={MAX_TICKER_LENGTH}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                <Label htmlFor="companyName">Company Name</Label>
                <input
                  id="companyName"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleFormChange}
                  placeholder="Apple Inc."
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="shares">Shares</Label>
                <input
                  id="shares"
                  name="shares"
                  type="number"
                  min="0.001"
                  step="any"
                  value={form.shares}
                  onChange={handleFormChange}
                  placeholder="10"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="purchasePrice">Buy Price ($)</Label>
                <input
                  id="purchasePrice"
                  name="purchasePrice"
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.purchasePrice}
                  onChange={handleFormChange}
                  placeholder="150.00"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="currentPrice">Current Price ($)</Label>
                <input
                  id="currentPrice"
                  name="currentPrice"
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.currentPrice}
                  onChange={handleFormChange}
                  placeholder="180.00"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
            <Button
              onClick={addStock}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add to Portfolio
            </Button>
          </CardContent>
        </Card>

        {/* Portfolio Table */}
        {stocks.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-green-600" />
                Your Portfolio
              </CardTitle>
              <CardDescription>
                {stocks.length} holding{stocks.length !== 1 ? "s" : ""} &bull;
                Total Value: {formatCurrency(totalValue)} &bull; Total P&L:{" "}
                <span
                  className={
                    totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {totalGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(totalGainLoss)} (
                  {totalCost > 0
                    ? ((totalGainLoss / totalCost) * 100).toFixed(2)
                    : "0.00"}
                  %)
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticker</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Company
                      </TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right hidden md:table-cell">
                        Buy Price
                      </TableHead>
                      <TableHead className="text-right">
                        Current Price
                      </TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">P&L</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">
                        Weight
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stocks.map((s) => {
                      const value = s.shares * s.currentPrice;
                      const cost = s.shares * s.purchasePrice;
                      const gainLoss = value - cost;
                      const gainLossPct = ((gainLoss / cost) * 100).toFixed(2);
                      const weight = ((value / totalValue) * 100).toFixed(1);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-semibold">
                            {s.ticker}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-gray-600">
                            {s.companyName}
                          </TableCell>
                          <TableCell className="text-right">
                            {s.shares}
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell">
                            {formatCurrency(s.purchasePrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(s.currentPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(value)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`flex items-center justify-end gap-1 ${
                                gainLoss >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {gainLoss >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {gainLoss >= 0 ? "+" : ""}
                              {gainLossPct}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell text-gray-500">
                            {weight}%
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => removeStock(s.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              aria-label="Remove stock"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Analysis Preferences</CardTitle>
            <CardDescription>
              Tell us about your investment profile for personalized
              recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col gap-2">
              <Label>Risk Tolerance</Label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as RiskTolerance[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRiskTolerance(r)}
                    className={`px-4 py-1.5 rounded-full text-sm border transition-colors capitalize ${
                      riskTolerance === r
                        ? "bg-green-600 text-white border-green-600"
                        : "border-gray-300 text-gray-700 hover:border-green-500"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Investment Horizon</Label>
              <div className="flex gap-2">
                {(["short", "medium", "long"] as InvestmentHorizon[]).map(
                  (h) => (
                    <button
                      key={h}
                      onClick={() => setInvestmentHorizon(h)}
                      className={`px-4 py-1.5 rounded-full text-sm border transition-colors capitalize ${
                        investmentHorizon === h
                          ? "bg-green-600 text-white border-green-600"
                          : "border-gray-300 text-gray-700 hover:border-green-500"
                      }`}
                    >
                      {h}
                    </button>
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analyze Button */}
        <div className="flex justify-center mb-8">
          <Button
            onClick={analyzePortfolio}
            disabled={loading || stocks.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base h-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analyzing your portfolio…
              </>
            ) : (
              <>
                <BarChart2 className="h-5 w-5 mr-2" />
                Analyze Portfolio with AI
              </>
            )}
          </Button>
        </div>

        {/* AI Analysis Result */}
        {analysis && (
          <Card className="mb-10 border-green-200 bg-white">
            <CardHeader className="border-b border-green-100">
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
                AI Portfolio Analysis
              </CardTitle>
              <CardDescription>
                Powered by AI &bull; Based on your portfolio &amp; preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <MarkdownContent content={analysis} />
              <p className="mt-6 text-xs text-gray-400 border-t pt-4">
                ⚠️ This analysis is generated by AI for informational purposes
                only. It does not constitute financial advice. Always consult a
                licensed financial advisor before making investment decisions.
              </p>
            </CardContent>
          </Card>
        )}
      </MaxWidthWrapper>
    </div>
  );
}
