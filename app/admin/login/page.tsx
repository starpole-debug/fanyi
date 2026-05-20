import Link from "next/link";
import { loginAction } from "@/app/admin/login/actions";

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="shell">
      <div className="login-wrap">
        <div className="login-card">
          <div>
            <h1>后台登录</h1>
            <p className="meta-text">这里替代你以前那个 Basic Auth，后面还可以继续升级成正式账号系统。</p>
          </div>
          {params.error ? <div className="callout callout-danger">用户名或密码不对。</div> : null}
          <form action={loginAction} className="field-grid">
            <div className="field">
              <label htmlFor="username">用户名</label>
              <input id="username" name="username" defaultValue="admin" required />
            </div>
            <div className="field">
              <label htmlFor="password">密码</label>
              <input id="password" name="password" type="password" required />
            </div>
            <button className="btn" type="submit">
              登录后台
            </button>
          </form>
          <Link className="muted-link" href="/">
            返回前台
          </Link>
        </div>
      </div>
    </main>
  );
}
