import LoginForm from "./login-form"

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <header className="mb-8">
        <p className="text-sm font-medium tracking-wide text-sage">Agent access</p>
        <h1 className="mt-2 font-serif text-3xl">Sign in to your dashboard</h1>
      </header>
      <LoginForm />
    </main>
  )
}
