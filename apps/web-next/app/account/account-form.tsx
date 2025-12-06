'use client';
import { mutedTextSmLegacy } from "@/styles/classnames";
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { type User } from '@supabase/supabase-js'
import Avatar from './avatar'
import FormField from "@/components/ui/form-field"
import { Loader2 } from "lucide-react"

export default function AccountForm({ user }: { user: User | null }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [fullname, setFullname] = useState<string | null>(null)
    const [username, setUsername] = useState<string | null>(null)
    const [website, setWebsite] = useState<string | null>(null)
    const [avatar_url, setAvatarUrl] = useState<string | null>(null)
    const [country, setCountry] = useState<string | null>(null)
    const [language, setLanguage] = useState<string | null>(null)
    const [timezone, setTimezone] = useState<string | null>(null)
    const [currency, setCurrency] = useState<string | null>(null)
    const [notifyMarketing, setNotifyMarketing] = useState<boolean>(true)
    const [notifyProductUpdates, setNotifyProductUpdates] = useState<boolean>(true)
    const [notifyOrderStatus, setNotifyOrderStatus] = useState<boolean>(true)
    const [notifyReviewReplies, setNotifyReviewReplies] = useState<boolean>(true)
    const [password, setPassword] = useState<string>("")
    const [passwordSaving, setPasswordSaving] = useState(false)

    const getProfile = useCallback(async () => {
        try {
            setLoading(true)

            const { data, error, status } = await supabase
                .from('profiles')
                .select(`full_name, username, website, avatar_url, country, language, timezone, currency, notify_marketing, notify_product_updates, notify_order_status, notify_review_replies`)
                .eq('id', user?.id)
                .single()

            if (error && status !== 406) {
                console.error('[account] profiles fetch failed', error)
                throw error
            }

            if (data) {
                setFullname(data.full_name)
                setUsername(data.username)
                setWebsite(data.website)
                setAvatarUrl(data.avatar_url)
                setCountry(data.country ?? null)
                setLanguage(data.language ?? null)
                setTimezone(data.timezone ?? null)
                setCurrency(data.currency ?? null)
                setNotifyMarketing(data.notify_marketing ?? true)
                setNotifyProductUpdates(data.notify_product_updates ?? true)
                setNotifyOrderStatus(data.notify_order_status ?? true)
                setNotifyReviewReplies(data.notify_review_replies ?? true)
            }
        } catch (error) {
            alert('Error loading user data!')
        } finally {
            setLoading(false)
        }
    }, [user, supabase])

    useEffect(() => {
        getProfile()
    }, [user, getProfile])

    async function updateProfile({
        username,
        website,
        avatar_url,
        country,
        language,
        timezone,
        currency,
        notify_marketing,
        notify_product_updates,
        notify_order_status,
        notify_review_replies,
    }: {
        username: string | null
        fullname: string | null
        website: string | null
        avatar_url: string | null
        country: string | null
        language: string | null
        timezone: string | null
        currency: string | null
        notify_marketing: boolean
        notify_product_updates: boolean
        notify_order_status: boolean
        notify_review_replies: boolean
    }) {
        try {
            setLoading(true)

            const { error } = await supabase.from('profiles').upsert({
                id: user?.id as string,
                full_name: fullname,
                username,
                website,
                avatar_url,
                country,
                language,
                timezone,
                currency,
                notify_marketing,
                notify_product_updates,
                notify_order_status,
                notify_review_replies,
                updated_at: new Date().toISOString(),
            })
            if (error) throw error
            alert('Profile updated!')
        } catch (error) {
            const msg = (error as any)?.message ?? JSON.stringify(error)
            console.error('profiles upsert error:', error)
            alert(`Error updating the data: ${msg}`)
        } finally {
            setLoading(false)
        }
    }

    async function handlePasswordChange(e: React.FormEvent) {
        e.preventDefault()
        if (!password.trim()) return
        try {
            setPasswordSaving(true)
            const { error } = await supabase.auth.updateUser({ password: password.trim() })
            if (error) {
                alert(error.message)
                return
            }
            alert('Password updated')
            setPassword('')
        } catch (error) {
            const msg = (error as any)?.message ?? JSON.stringify(error)
            console.error('password update error:', error)
            alert(`Error updating password: ${msg}`)
        } finally {
            setPasswordSaving(false)
        }
    }

    return (
        <div className="surface mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-[calc(var(--radius)+1rem)] border border-border/40 bg-card/70 p-8 shadow-card">
            <div className="flex flex-col items-center gap-4 text-center">
                <Avatar
                    uid={user?.id ?? null}
                    url={avatar_url}
                    size={150}
                    onUpload={(url) => {
                        setAvatarUrl(url)
                        updateProfile({
                            fullname,
                            username,
                            website,
                            avatar_url: url,
                            country,
                            language,
                            timezone,
                            currency,
                            notify_marketing: notifyMarketing,
                            notify_product_updates: notifyProductUpdates,
                            notify_order_status: notifyOrderStatus,
                            notify_review_replies: notifyReviewReplies,
                        })
                    }}
                />
                <div className="space-y-1">
                    <p className="text-sm font-medium uppercase tracking-[0.32em] text-muted/80">Account</p>
                    <h2 className="text-2xl font-semibold text-fg">Profile & preferences</h2>
                    <p className={mutedTextSmLegacy}>
                        Update your public information, avatar and preferences. Changes are saved instantly after upload.
                    </p>
                </div>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
                <div className="grid gap-5">
                    <FormField id="email" label="Email">
                        <input
                            type="text"
                            value={user?.email ?? ''}
                            disabled
                            className="w-full rounded-2xl border border-border/40 bg-card/40 px-4 py-3 text-sm text-muted/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        />
                    </FormField>

                    <FormField id="fullName" label="Full name">
                        <input
                            type="text"
                            value={fullname || ''}
                            onChange={(e) => setFullname(e.target.value)}
                            className="w-full rounded-2xl border border-border/40 bg-transparent px-4 py-3 text-sm text-fg transition focus:border-primary/50 focus:bg-card/70 focus:ring-2 focus:ring-primary/30"
                        />
                    </FormField>

                    <FormField id="username" label="Username">
                        <input
                            type="text"
                            value={username || ''}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-2xl border border-border/40 bg-transparent px-4 py-3 text-sm text-fg transition focus:border-primary/50 focus:bg-card/70 focus:ring-2 focus:ring-primary/30"
                        />
                    </FormField>

                    <FormField id="website" label="Website">
                        <input
                            type="url"
                            value={website || ''}
                            onChange={(e) => setWebsite(e.target.value)}
                            className="w-full rounded-2xl border border-border/40 bg-transparent px-4 py-3 text-sm text-fg transition focus:border-primary/50 focus:bg-card/70 focus:ring-2 focus:ring-primary/30"
                        />
                    </FormField>

                    <div className="grid gap-3 rounded-2xl border border-border/40 bg-card/40 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                            Profile locale
                        </p>
                        <FormField id="country" label="Country" description="Country or region">
                            <input
                                type="text"
                                value={country || ''}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="Germany, USA, ..."
                                className="w-full rounded-xl border border-border/40 bg-transparent px-3 py-2 text-sm text-fg focus:border-primary/50 focus:bg-card/70 focus:ring-2 focus:ring-primary/30"
                            />
                        </FormField>
                        <FormField id="language" label="Language">
                            <input
                                type="text"
                                value={language || ''}
                                onChange={(e) => setLanguage(e.target.value)}
                                placeholder="ru-RU, en-US"
                                className="w-full rounded-xl border border-border/40 bg-transparent px-3 py-2 text-sm text-fg focus:border-primary/50 focus:bg-card/70 focus:ring-2 focus:ring-primary/30"
                            />
                        </FormField>
                        <FormField id="timezone" label="Time zone">
                            <input
                                type="text"
                                value={timezone || ''}
                                onChange={(e) => setTimezone(e.target.value)}
                                placeholder="Europe/Berlin"
                                className="w-full rounded-xl border border-border/40 bg-transparent px-3 py-2 text-sm text-fg focus:border-primary/50 focus:bg-card/70 focus:ring-2 focus:ring-primary/30"
                            />
                        </FormField>
                        <FormField id="currency" label="Currency">
                            <input
                                type="text"
                                value={currency || ''}
                                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                                placeholder="EUR, USD, RUB"
                                className="w-full rounded-xl border border-border/40 bg-transparent px-3 py-2 text-sm text-fg focus:border-primary/50 focus:bg-card/70 focus:ring-2 focus:ring-primary/30"
                            />
                        </FormField>
                    </div>
                </div>

                <div className="grid gap-5">
                    <div className="grid gap-3 rounded-2xl border border-border/40 bg-card/40 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                            Security
                        </p>
                        <form className="grid gap-3" onSubmit={handlePasswordChange}>
                            <label className="grid gap-1 text-sm" htmlFor="newPassword">
                                <span className="text-xs text-muted">New password</span>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-border/40 bg-transparent px-3 py-2 text-sm text-fg focus:border-primary/50 focus:bg-card/70 focus:ring-2 focus:ring-primary/30"
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={passwordSaving || !password.trim()}
                                className="inline-flex items-center justify-center rounded-full border border-primary/60 bg-primary px-5 py-2 text-xs font-semibold text-primaryfg transition hover:-translate-y-[1px]"
                            >
                                {passwordSaving ? 'Saving…' : 'Change password'}
                            </button>
                            <p className={mutedTextSmLegacy}>
                                Two-factor auth and social login can be added later; сейчас смена пароля работает через Supabase.
                            </p>
                        </form>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-border/40 bg-card/40 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                            Notifications
                        </p>
                        <label className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-fg">Marketing & promotions</span>
                            <input
                                type="checkbox"
                                checked={notifyMarketing}
                                onChange={(e) => setNotifyMarketing(e.target.checked)}
                            />
                        </label>
                        <label className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-fg">New products & updates</span>
                            <input
                                type="checkbox"
                                checked={notifyProductUpdates}
                                onChange={(e) => setNotifyProductUpdates(e.target.checked)}
                            />
                        </label>
                        <label className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-fg">Order status emails</span>
                            <input
                                type="checkbox"
                                checked={notifyOrderStatus}
                                onChange={(e) => setNotifyOrderStatus(e.target.checked)}
                            />
                        </label>
                        <label className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-fg">Replies to my reviews</span>
                            <input
                                type="checkbox"
                                checked={notifyReviewReplies}
                                onChange={(e) => setNotifyReviewReplies(e.target.checked)}
                            />
                        </label>
                        <p className={mutedTextSmLegacy}>
                            Эти настройки пока только сохраняются в профиле; логику рассылок можно привязать к ним позже.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                    className="inline-flex items-center justify-center rounded-full border border-primary/60 bg-primary px-6 py-3 text-sm font-semibold text-primaryfg shadow-[0_24px_60px_-32px_rgba(252,50,114,0.7)] transition hover:-translate-y-[1px] hover:shadow-[0_32px_72px_-34px_rgba(252,50,114,0.82)]"
                    onClick={() =>
                        updateProfile({
                            fullname,
                            username,
                            website,
                            avatar_url,
                            country,
                            language,
                            timezone,
                            currency,
                            notify_marketing: notifyMarketing,
                            notify_product_updates: notifyProductUpdates,
                            notify_order_status: notifyOrderStatus,
                            notify_review_replies: notifyReviewReplies,
                        })
                    }
                    disabled={loading}
                >
                    {loading ? 'Loading ...' : 'Save profile changes'}
                </button>

                <form action="/auth/signout" method="post" className="w-full sm:w-auto">
                    <button
                        className="inline-flex w-full items-center justify-center rounded-full border border-border/60 bg-card/60 px-6 py-3 text-sm font-semibold text-fg transition hover:bg-card focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        type="submit"
                    >
                        Sign out
                    </button>
                </form>
            </div>
        </div>
    );
}
