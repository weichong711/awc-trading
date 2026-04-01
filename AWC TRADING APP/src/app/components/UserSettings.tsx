import { useState } from "react";
import {
  User, LogOut, Download, Upload, Building2, Mail, Lock, CreditCard, Shield, Globe,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "./ui/alert-dialog";
import { SubscriptionBilling } from "./SubscriptionBilling";
import { AdminPanel } from "./AdminPanel";
import { ADMIN_EMAIL } from "../../lib/supabase";
import { useLanguage, Language } from "../contexts/LanguageContext";

interface UserSettingsProps {
  currentUser: { username: string; email: string; businessName: string };
  onUpdateUser: (user: { username: string; email: string; businessName: string }) => void;
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
        <TabsList className={`grid w-full mb-6 ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />{t.settings.adminPanel}
            </TabsTrigger>
          )}
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />{t.settings.accountSettings}
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />{t.settings.subscriptionBilling}
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
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 items-center">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t.settings.password}</p>
                    <p className="text-xs text-muted-foreground">{t.settings.passwordManagedBy}</p>
                  </div>
                </div>
                <Button variant="outline" disabled>{t.settings.changePassword}</Button>
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

        {/* ── BILLING TAB ── */}
        <TabsContent value="billing" className="mt-0">
          <SubscriptionBilling />
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
