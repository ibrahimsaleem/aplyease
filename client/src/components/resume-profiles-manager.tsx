import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { ResumeProfile } from "@/types";
import { Pencil, Plus, Star, Trash2, Upload } from "lucide-react";

interface ResumeProfilesManagerProps {
  clientId: string;
  legacyBaseResumeLatex?: string | null;
}

export function ResumeProfilesManager({ clientId, legacyBaseResumeLatex }: ResumeProfilesManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const canManage =
    !!user &&
    (user.role === "ADMIN" ||
      user.role === "EMPLOYEE" ||
      (user.role === "CLIENT" && user.id === clientId));

  const { data: profiles = [], isLoading } = useQuery<ResumeProfile[]>({
    queryKey: ["/api/resume-profiles", clientId],
    enabled: !!clientId,
  });

  const defaultProfile = useMemo(() => profiles.find((p) => p.isDefault) ?? null, [profiles]);
  const hasProfiles = profiles.length > 0;
  const canImportLegacy = !!legacyBaseResumeLatex && legacyBaseResumeLatex.trim().length > 0 && !hasProfiles;

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftLatex, setDraftLatex] = useState("");
  const [editing, setEditing] = useState<ResumeProfile | null>(null);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/resume-profiles", clientId] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; baseResumeLatex: string; isDefault?: boolean }) => {
      const res = await apiRequest("POST", `/api/resume-profiles/${clientId}`, payload);
      return res.json();
    },
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Profile created", description: "Base resume profile saved." });
      setCreateOpen(false);
      setDraftName("");
      setDraftLatex("");
    },
    onError: (error: any) => {
      toast({ title: "Create failed", description: error.message || "Failed to create profile", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { profileId: string; name: string; baseResumeLatex: string }) => {
      const res = await apiRequest("PUT", `/api/resume-profiles/${clientId}/${payload.profileId}`, {
        name: payload.name,
        baseResumeLatex: payload.baseResumeLatex,
      });
      return res.json();
    },
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Profile updated", description: "Changes saved." });
      setEditOpen(false);
      setEditing(null);
      setDraftName("");
      setDraftLatex("");
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message || "Failed to update profile", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const res = await apiRequest("DELETE", `/api/resume-profiles/${clientId}/${profileId}`);
      return res.json();
    },
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Profile deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Delete failed", description: error.message || "Failed to delete profile", variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const res = await apiRequest("POST", `/api/resume-profiles/${clientId}/${profileId}/default`);
      return res.json();
    },
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Default updated", description: "This profile is now the default." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to set default", description: error.message || "Try again", variant: "destructive" });
    },
  });

  const openCreate = () => {
    setDraftName("");
    setDraftLatex("");
    setCreateOpen(true);
  };

  const openEdit = (p: ResumeProfile) => {
    setEditing(p);
    setDraftName(p.name);
    setDraftLatex(p.baseResumeLatex);
    setEditOpen(true);
  };

  const importLegacy = () => {
    if (!legacyBaseResumeLatex) return;
    createMutation.mutate({
      name: "Imported base resume",
      baseResumeLatex: legacyBaseResumeLatex,
      isDefault: true,
    });
  };

  return (
    <Card className="lg:col-span-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-purple-900">Resume Profiles (Base Templates)</CardTitle>
            <CardDescription>
              Save multiple base resumes (e.g., Cybersecurity, Data Science). Pick one as the default for tailoring.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {canImportLegacy && (
              <Button
                variant="outline"
                onClick={importLegacy}
                disabled={!canManage || createMutation.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import legacy
              </Button>
            )}
            <Button onClick={openCreate} disabled={!canManage}>
              <Plus className="w-4 h-4 mr-2" />
              New profile
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canManage && (
          <p className="text-sm text-slate-600">
            You can view profiles, but only the client/employee/admin can manage them.
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-600">Loading profiles…</p>
        ) : profiles.length === 0 ? (
          <div className="text-sm text-slate-700">
            No resume profiles yet. Create one (recommended), or use the legacy single base resume field.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {profiles.map((p) => (
              <Card key={p.id} className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base truncate">{p.name}</CardTitle>
                        {p.isDefault && <Badge className="bg-purple-600">Default</Badge>}
                      </div>
                      {!p.isDefault && defaultProfile && (
                        <p className="text-xs text-slate-500 mt-1">
                          Default: {defaultProfile.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(p)}
                        disabled={!canManage}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" disabled={!canManage}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete profile?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete “{p.name}”.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(p.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto max-h-40 overflow-y-auto">
                    <code className="text-xs font-mono">
                      {p.baseResumeLatex.split("\n").slice(0, 10).join("\n")}
                      {"\n"}
                      {"…"}
                    </code>
                  </pre>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      variant={p.isDefault ? "secondary" : "outline"}
                      onClick={() => setDefaultMutation.mutate(p.id)}
                      disabled={!canManage || p.isDefault || setDefaultMutation.isPending}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      {p.isDefault ? "Default" : "Set default"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create resume profile</DialogTitle>
              <DialogDescription>Save a named base resume LaTeX template.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Profile name (e.g., Cybersecurity)"
              />
              <Textarea
                value={draftLatex}
                onChange={(e) => setDraftLatex(e.target.value)}
                placeholder="Paste base resume LaTeX here…"
                className="min-h-[260px] font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    createMutation.mutate({
                      name: draftName.trim(),
                      baseResumeLatex: draftLatex,
                      isDefault: true,
                    })
                  }
                  disabled={!draftName.trim() || !draftLatex || createMutation.isPending}
                >
                  Save (as default)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit resume profile</DialogTitle>
              <DialogDescription>Update the name or LaTeX for this base template.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Profile name"
              />
              <Textarea
                value={draftLatex}
                onChange={(e) => setDraftLatex(e.target.value)}
                placeholder="Base resume LaTeX…"
                className="min-h-[260px] font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!editing) return;
                    updateMutation.mutate({
                      profileId: editing.id,
                      name: draftName.trim(),
                      baseResumeLatex: draftLatex,
                    });
                  }}
                  disabled={!editing || !draftName.trim() || !draftLatex || updateMutation.isPending}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

