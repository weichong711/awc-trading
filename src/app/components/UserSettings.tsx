import { useState } from "react";
import {
  User,
  LogOut,
  Download,
  Upload,
  Building2,
  Mail,
  Lock,
  Shield,
  Globe,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { AdminPanel } from "./AdminPanel";
import { ADMIN_EMAIL } from "../../lib/supabase";
import { useLanguage, Language } from "../contexts/LanguageContext";

interface UserSettingsProps {
  currentUser: {
    username: string;
    email: string;
    businessName: string;
    phoneNumber: string;
  };
  onUpdateUser: (user: {
    username: string;
    email: string;
    businessName: string;
    phoneNumber: string;
  }) => void | Promise<void>;
  onLogout: () => void;
  onExportData: () => void;
  onImportData: (data: string) => void;
  accessToken?: string;
}

const LANGUAGES: { code: Language; flag: string; label: string; native: string }[] = [
  { code: "en", flag: "🇬🇧", label: "English",         native: "English" },
  { code: "ms", flag: "🇲🇾", label: "Bahasa Malaysia", native: "Bahasa Malaysia" },
  { code: "zh", flag: "🇨🇳", label: "Chinese",         native: "中文" },
];

export function UserSettings({ currentUser, onUpdateUser, onLogout, onExportData, onImportData, accessToken }: UserSettingsProps) {
  const { t, language, setLanguage } = useLanguage();
  const [userData, setUserData] = useState(currentUser);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const isAdmin = currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const [settingsTab, setSettingsTab] = useState(isAdmin ? "admin" : "profile");

  // ── Change password state ─────────────────────────────────────────────────
  const [pwCurrent, setPwCurrent]   = useState("");
  const [pwNew, setPwNew]           = useState("");
  const [pwConfirm, setPwConfirm]   = useState("");
  const [pwLoading, setPwLoading]   = useState(false);
  const [pwMsg, setPwMsg]           = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew]         = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwMsg({ type: "error", text: "Please fill in all password fields." });
      return;
    }
    if (pwNew.length < 6) {
      setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    setPwLoading(true);
    try {
      // Re-authenticate with current password first to verify it's correct
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: pwCurrent,
      });
      if (signInError) {
        setPwMsg({ type: "error", text: "Current password is incorrect." });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: pwNew });
      if (error) {
        setPwMsg({ type: "error", text: error.message });
      } else {
        setPwMsg({ type: "success", text: "Password updated successfully." });
        setPwCurrent(""); setPwNew(""); setPwConfirm("");
      }
    } catch (err) {
      setPwMsg({ type: "error", text: `Unexpected error: ${err}` });
    } finally {
      setPwLoading(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const r = new FileReader();
        r.onload = (ev) => { try { onImportData(ev.target?.result as string); } catch {} };
        r.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Tabs value={settingsTab} onValueChange={setSettingsTab}>
        <TabsList className={`grid w-full mb-6 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />{t.settings.adminPanel}
            </TabsTrigger>
          )}
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />{t.settings.accountSettings}
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="admin" className="mt-0">
            <AdminPanel accessToken={accessToken || ""} />
          </TabsContent>
        )}

        <TabsContent value="profile" className="space-y-6 mt-0">

          {/* ── LANGUAGE SELECTOR ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t.settings.language}
              </CardTitle>
              <CardDescription>{t.settings.languageDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      language === lang.code
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-3xl">{lang.flag}</span>
                    <div className="text-center">
                      <p className={`text-sm font-semibold ${language === lang.code ? "text-primary" : ""}`}>
                        {lang.native}
                      </p>
                      <p className="text-xs text-muted-foreground">{lang.label}</p>
                    </div>
                    {language === lang.code && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                        ✓ Active
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── PROFILE SETTINGS ── */}
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.profileSettings}</CardTitle>
              <CardDescription>{t.settings.profileDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="username">{t.settings.username}</Label>
                <div className="flex gap-2">
                  <User className="h-5 w-5 text-muted-foreground mt-2" />
                  <Input id="username" value={userData.username} onChange={e => setUserData({ ...userData, username: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t.settings.email}</Label>
                <div className="flex gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground mt-2" />
                  <Input id="email" type="email" value={userData.email} onChange={e => setUserData({ ...userData, email: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">{t.settings.phoneNumber ?? "Phone Number"}</Label>
                <div className="flex gap-2">
                  <Phone className="h-5 w-5 text-muted-foreground mt-2" />
                  <Input
                    id="phoneNumber"
                    value={userData.phoneNumber}
                    onChange={(e) =>
                      setUserData({
                        ...userData,
                        phoneNumber: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="businessName">{t.settings.businessName}</Label>
                <div className="flex gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-2" />
                  <Input id="businessName" value={userData.businessName} onChange={e => setUserData({ ...userData, businessName: e.target.value })} />
                </div>
              </div>
              <Button onClick={() => onUpdateUser(userData)}>{t.settings.saveChanges}</Button>
            </CardContent>
          </Card>

          {/* ── DATA MANAGEMENT ── */}
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.dataManagement}</CardTitle>
              <CardDescription>{t.settings.dataManagementDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={onExportData} variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />{t.settings.exportData}
                </Button>
                <Button onClick={handleImport} variant="outline" className="flex-1">
                  <Upload className="mr-2 h-4 w-4" />{t.settings.importData}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t.settings.dataManagementHint}</p>
            </CardContent>
          </Card>

          {/* ── SECURITY ── */}
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.security}</CardTitle>
              <CardDescription>{t.settings.securityDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Current password */}
                <div className="grid gap-1.5">
                  <Label htmlFor="pw-current">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pw-current"
                      type={showPwCurrent ? "text" : "password"}
                      value={pwCurrent}
                      onChange={e => { setPwCurrent(e.target.value); setPwMsg(null); }}
                      className="pl-9 pr-10"
                      placeholder="Enter current password"
                    />
                    <button type="button" onClick={() => setShowPwCurrent(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {/* New password */}
                <div className="grid gap-1.5">
                  <Label htmlFor="pw-new">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pw-new"
                      type={showPwNew ? "text" : "password"}
                      value={pwNew}
                      onChange={e => { setPwNew(e.target.value); setPwMsg(null); }}
                      className="pl-9 pr-10"
                      placeholder="Min. 6 characters"
                    />
                    <button type="button" onClick={() => setShowPwNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {/* Confirm new password */}
                <div className="grid gap-1.5">
                  <Label htmlFor="pw-confirm">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pw-confirm"
                      type={showPwConfirm ? "text" : "password"}
                      value={pwConfirm}
                      onChange={e => { setPwConfirm(e.target.value); setPwMsg(null); }}
                      className={`pl-9 pr-10 ${pwConfirm && pwConfirm !== pwNew ? "border-red-400" : ""}`}
                      placeholder="Re-enter new password"
                    />
                    <button type="button" onClick={() => setShowPwConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {pwConfirm && pwConfirm !== pwNew && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                {/* Feedback message */}
                {pwMsg && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    pwMsg.type === "success"
                      ? "bg-green-50 border border-green-200 text-green-700"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}>
                    {pwMsg.type === "success"
                      ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                    {pwMsg.text}
                  </div>
                )}

                <Button onClick={handleChangePassword} disabled={pwLoading}>
                  {pwLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</> : "Update Password"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── SESSION ── */}
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.session}</CardTitle>
              <CardDescription>{t.settings.sessionDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{t.settings.currentSession}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.loggedInAs} {currentUser.email}</p>
                </div>
                <Button variant="destructive" onClick={() => setLogoutDialogOpen(true)}>
                  <LogOut className="mr-2 h-4 w-4" />{t.settings.logout}
                </Button>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

      </Tabs>

      {/* Logout Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.settings.confirmLogout}</AlertDialogTitle>
            <AlertDialogDescription>{t.settings.confirmLogoutDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={onLogout}>{t.settings.logout}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
