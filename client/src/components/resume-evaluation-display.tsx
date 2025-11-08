import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, XCircle, TrendingUp } from "lucide-react";
import type { ResumeEvaluation } from "@/types";

interface ResumeEvaluationDisplayProps {
  evaluation: ResumeEvaluation;
  iterationCount: number;
}

export function ResumeEvaluationDisplay({ evaluation, iterationCount }: ResumeEvaluationDisplayProps) {
  const { score, overallAssessment, strengths, improvements, missingElements } = evaluation;

  // Determine score color and icon
  const getScoreColor = (score: number) => {
    if (score >= 90) return { color: "text-green-600", bg: "bg-green-50", border: "border-green-200", icon: CheckCircle2 };
    if (score >= 75) return { color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", icon: AlertCircle };
    return { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: XCircle };
  };

  const scoreStyle = getScoreColor(score);
  const ScoreIcon = scoreStyle.icon;

  return (
    <Card className={`border-2 ${scoreStyle.border} ${scoreStyle.bg}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ScoreIcon className={`w-8 h-8 ${scoreStyle.color}`} />
            <div>
              <CardTitle className="text-2xl">
                Resume Score: <span className={scoreStyle.color}>{score}/100</span>
              </CardTitle>
              <p className="text-sm text-slate-600">Iteration {iterationCount}</p>
            </div>
          </div>
          {score >= 90 ? (
            <Badge className="bg-green-600 hover:bg-green-700 text-white text-lg px-4 py-1">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Excellent!
            </Badge>
          ) : score >= 75 ? (
            <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white text-lg px-4 py-1">
              <TrendingUp className="w-4 h-4 mr-1" />
              Good Progress
            </Badge>
          ) : (
            <Badge className="bg-red-600 hover:bg-red-700 text-white text-lg px-4 py-1">
              <AlertCircle className="w-4 h-4 mr-1" />
              Needs Work
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Assessment */}
        <Alert>
          <AlertDescription className="text-slate-700">
            {overallAssessment}
          </AlertDescription>
        </Alert>

        {/* Strengths */}
        {strengths && strengths.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Strengths
            </h3>
            <ul className="space-y-1">
              {strengths.map((strength, index) => (
                <li key={index} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements Needed */}
        {improvements && improvements.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Areas for Improvement
            </h3>
            <ul className="space-y-1">
              {improvements.map((improvement, index) => (
                <li key={index} className="text-sm text-slate-700 flex items-start gap-2">
                  <span className="text-orange-600 mt-1">→</span>
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Elements */}
        {missingElements && missingElements.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Missing Keywords/Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {missingElements.map((element, index) => (
                <Badge key={index} variant="destructive" className="text-xs">
                  {element}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps Message */}
        {score < 90 && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Click <strong>"Optimize Again"</strong> to improve this resume further. The AI will address the improvements and missing elements identified above.
            </AlertDescription>
          </Alert>
        )}

        {score >= 90 && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Excellent work!</strong> This resume is highly optimized for ATS systems and well-aligned with the job requirements. You can still click <strong>"Optimize Again"</strong> to refine it further if desired.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

