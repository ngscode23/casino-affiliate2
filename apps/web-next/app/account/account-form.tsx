'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { type User } from '@supabase/supabase-js'
import Avatar from './avatar'

export default function AccountForm({ user }: { user: User | null }) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [fullname, setFullname] = useState<string | null>(null)
    const [username, setUsername] = useState<string | null>(null)
    const [website, setWebsite] = useState<string | null>(null)
    const [avatar_url, setAvatarUrl] = useState<string | null>(null)

    const getProfile = useCallback(async () => {
        try {
            setLoading(true)

            const { data, error, status } = await supabase
                .from('profiles')
                .select(`full_name, username, website, avatar_url`)
                .eq('id', user?.id)
                .single()

            if (error && status !== 406) {
                console.log(error)
                throw error
            }

            if (data) {
                setFullname(data.full_name)
                setUsername(data.username)
                setWebsite(data.website)
                setAvatarUrl(data.avatar_url)
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
    }: {
        username: string | null
        fullname: string | null
        website: string | null
        avatar_url: string | null
    }) {
        try {
            setLoading(true)

            const { error } = await supabase.from('profiles').upsert({
                id: user?.id as string,
                full_name: fullname,
                username,
                website,
                avatar_url,
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

    return (
        <div className="surface mx-auto flex w-full max-w-xl flex-col gap-8 rounded-[calc(var(--radius)+1rem)] border border-border/40 bg-card/70 p-8 shadow-card">
            <div className="flex flex-col items-center gap-4 text-center">
                <Avatar
                    uid={user?.id ?? null}
                    url={avatar_url}
                    size={150}
                    onUpload={(url) => {
                        setAvatarUrl(url)
                        updateProfile({ fullname, username, website, avatar_url: url })
                    }}
                />
                <div className="space-y-1">
                    <p className="text-sm font-medium uppercase tracking-[0.32em] text-muted/80">Account</p>
                    <h2 className="text-2xl font-semibold text-fg">Profile preferences</h2>
                    <p className="text-sm text-muted">
                        Update your public information and avatar. Changes are saved instantly after upload.
                    </p>
                </div>
            </div>

            <div className="grid gap-5">
                <label className="grid gap-2" htmlFor="email">
                    <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Email</span>
                    <input
                        id="email"
                        type="text"
                        value={user?.email ?? ''}
                        disabled
                        className="w-full rounded-2xl border border-border/40 bg-card/40 px-4 py-3 text-sm text-muted/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    />
                </label>

                <label className="grid gap-2" htmlFor="fullName">
                    <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Full name</span>
                    <input
                        id="fullName"
                        type="text"
                        value={fullname || ''}
                        onChange={(e) => setFullname(e.target.value)}
                        className="w-full rounded-2xl border border-border/40 bg-transparent px-4 py-3 text-sm text-fg transition focus:border-primary/50 focus:bg-card/70 focus:ring-2 focus:ring-primary/30"
                    />
                </label>

                <label className="grid gap-2" htmlFor="username">
                    <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Username</span>
                    <input
                        id="username"
                        type="text"
                        value={username || ''}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-2xl border border-border/40 bg-transparent px-4 py-3 text-sm text-fg transition focus:border-primary/50 focus:bg-card/70 focus:ring-2 focus:ring-primary/30"
                    />
                </label>

                <label className="grid gap-2" htmlFor="website">
                    <span className="text-xs font-semibold uppercase tracking-[0.32em] text-muted">Website</span>
                    <input
                        id="website"
                        type="url"
                        value={website || ''}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full rounded-2xl border border-border/40 bg-transparent px-4 py-3 text-sm text-fg transition focus:border-primary/50 focus:bg-card/70 focus:ring-2 focus:ring-primary/30"
                    />
                </label>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                    className="inline-flex items-center justify-center rounded-full border border-primary/60 bg-primary px-6 py-3 text-sm font-semibold text-primaryfg shadow-[0_24px_60px_-32px_rgba(252,50,114,0.7)] transition hover:-translate-y-[1px] hover:shadow-[0_32px_72px_-34px_rgba(252,50,114,0.82)]"
                    onClick={() => updateProfile({ fullname, username, website, avatar_url })}
                    disabled={loading}
                >
                    {loading ? 'Loading ...' : 'Update profile'}
                </button>

                <form action="/auth/signout" method="post" className="w-full sm:w-auto">
                    <button
                        className="inline-flex w-full items-center justify-center rounded-full border border-border/50 bg-transparent px-6 py-3 text-sm font-medium text-muted transition hover:border-border/70 hover:bg-card/40 hover:text-fg"
                        type="submit"
                    >
                        Sign out
                    </button>
                </form>
            </div>
        </div>
    )
}
