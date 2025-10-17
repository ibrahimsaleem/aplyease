import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RefreshCw, Mail, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmailSyncStatus {
  message: string;
  lastSync: string;
  isRunning?: boolean;
}

export function EmailSyncStatus() {
  const { toast } = useToast();
  const [isManualSync, setIsManualSync] = useState(false);

  const { data: status, refetch } = useQuery<EmailSyncStatus>({
    queryKey: ["/api/email-sync/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/email-sync/status");
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const triggerSync = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email-sync/trigger");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sync Started",
        description: "Email sync is running in the background. Check back in a few minutes.",
      });
      setIsManualSync(true);
      // Reset manual sync indicator after 2 minutes
      setTimeout(() => setIsManualSync(false), 120000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start email sync",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = () => {
    if (isManualSync) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />;
    }
    if (status?.isRunning) {
      return <Clock className="w-4 h-4 text-yellow-600" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const getStatusBadge = () => {
    if (isManualSync) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Syncing...</Badge>;
    }
    if (status?.isRunning) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Running</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Ready</Badge>;
  };

  const formatLastSync = (lastSync: string) => {
    const date = new Date(lastSync);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Sync Status
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-slate-600">
          <p className="mb-2">
            Automatically syncs job application statuses from your Gmail inbox.
          </p>
          <div className="flex items-center gap-2">
            <span className="font-medium">Last sync:</span>
            <span>{status?.lastSync ? formatLastSync(status.lastSync) : "Never"}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => triggerSync.mutate()}
            disabled={triggerSync.isPending || isManualSync}
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
            {triggerSync.isPending ? "Starting..." : "Sync Now"}
          </Button>
          
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded">
          <p className="font-medium mb-1">How it works:</p>
          <ul className="space-y-1">
            <li>• Scans your Gmail for job-related emails</li>
            <li>• Uses AI to extract status updates (interview invites, rejections, offers)</li>
            <li>• Automatically updates application statuses in the system</li>
            <li>• Runs every 6 hours automatically</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}