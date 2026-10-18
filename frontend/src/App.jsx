import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import "./App.css";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const ROLE = {
  STUDENT: "Student",
  FACULTY: "Faculty",
  ADMIN: "Admin"
};

const NAV = {
  Student: [
    ["dashboard", "Dashboard", "⌂"],
    ["projects", "Browse Projects", "◫"],
    ["recommendations", "Recommendations", "✦"],
    ["applications", "My Applications", "✓"],
    ["preferences", "Preferences", "♡"],
    ["skills", "My Skills", "◆"],
    ["teams", "My Teams", "◇"],
    ["milestones", "Milestones", "◈"],
    ["tasks", "My Tasks", "☷"],
    ["progress", "Progress", "↗"],
    ["resources", "Resources", "▣"],
    ["issues", "Issues", "⚠"],
    ["risks", "Risks", "△"],
    ["evaluations", "Evaluations", "★"],
    ["notifications", "Notifications", "●"],
    ["profile", "Profile", "◎"]
  ],

  Faculty: [
    ["dashboard", "Dashboard", "⌂"],
    ["projects", "My Projects", "◫"],
    ["applications", "Applications", "✓"],
    ["recommendations", "Recommended Students", "✦"],
    ["teams", "Teams", "◇"],
    ["milestones", "Milestones", "◈"],
    ["tasks", "Tasks", "☷"],
    ["progress", "Progress Review", "↗"],
    ["resources", "Resources", "▣"],
    ["issues", "Issues", "⚠"],
    ["risks", "Risks", "△"],
    ["evaluations", "Evaluations", "★"],
    ["notifications", "Notifications", "●"],
    ["profile", "Profile", "◎"]
  ],

  Admin: [
    ["dashboard", "Dashboard", "⌂"],
    ["users", "Users", "◉"],
    ["students", "Students", "♙"],
    ["faculty", "Faculty", "♧"],
    ["departments", "Departments", "⌘"],
    ["projects", "All Projects", "◫"],
    ["approvals", "Approvals", "✓"],
    ["teams", "Teams", "◇"],
    ["resources", "Resources", "▣"],
    ["issues", "Issues", "⚠"],
    ["risks", "Risks", "△"],
    ["reports", "Reports", "▤"],
    ["notifications", "Notifications", "●"]
  ]
};

const PROJECT_STATUS = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Open",
  "Ongoing",
  "Completed",
  "Rejected"
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function initials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part[0]?.toUpperCase()
      )
      .join("") || "RH"
  );
}

function statusClass(status) {
  const value = String(
    status || ""
  )
    .toLowerCase()
    .replace(/\s+/g, "-");

  if (
    value.includes("approved") ||
    value.includes("accepted") ||
    value.includes("completed") ||
    value.includes("promoted") ||
    value === "open" ||
    value === "resolved"
  ) {
    return "status-success";
  }

  if (
    value.includes("pending") ||
    value.includes("waiting") ||
    value.includes("ongoing") ||
    value.includes("progress") ||
    value === "allocated"
  ) {
    return "status-warning";
  }

  if (
    value.includes("reject") ||
    value.includes("closed") ||
    value.includes("removed")
  ) {
    return "status-danger";
  }

  return "status-neutral";
}

function scoreClass(score) {
  const value =
    Number(score || 0);

  if (value >= 80) {
    return "score-high";
  }

  if (value >= 60) {
    return "score-mid";
  }

  return "score-low";
}

async function apiRequest(
  path,
  options = {}
) {
  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers: {
        ...(options.body
          ? {
              "Content-Type":
                "application/json"
            }
          : {}),
        ...(options.headers || {})
      }
    }
  );

  const text =
    await response.text();

  let data = {};

  try {
    data = text
      ? JSON.parse(text)
      : {};
  } catch {
    data = {
      message:
        text ||
        "Invalid server response"
    };
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed (${response.status})`
    );
  }

  return data;
}

function useFetchData(
  path,
  enabled = true
) {
  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(enabled);

  const [error, setError] =
    useState("");

  const reload = useCallback(
    async () => {
      if (!enabled || !path) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result =
          await apiRequest(path);

        setData(result);
      } catch (err) {
        setError(
          err?.message ||
            "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    },
    [path, enabled]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    data,
    loading,
    error,
    reload
  };
}

function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  small = false,
  className = ""
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "btn",
        `btn-${variant}`,
        small ? "btn-small" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  options = [],
  textarea = false,
  min,
  max,
  step
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <em> *</em>}
      </span>

      {textarea ? (
        <textarea
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          required={required}
        />
      ) : options.length ? (
        <select
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value)
          }
          required={required}
        >
          <option value="">
            Select {label}
          </option>

          {options.map(
            (option) => (
              <option
                key={String(
                  option.value ??
                    option.id ??
                    option
                )}
                value={
                  option.value ??
                  option.id ??
                  option
                }
              >
                {option.label ??
                  option.name ??
                  option.skill_name ??
                  option.project_title ??
                  option.full_name ??
                  option.department_name ??
                  option}
              </option>
            )
          )}
        </select>
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
        />
      )}
    </label>
  );
}

function Card({
  title,
  subtitle,
  children,
  actions,
  className = ""
}) {
  return (
    <section
      className={[
        "card",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && (
              <h3>{title}</h3>
            )}

            {subtitle && (
              <p>{subtitle}</p>
            )}
          </div>

          {actions}
        </div>
      )}

      {children}
    </section>
  );
}

function EmptyState({
  title,
  text,
  action
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        ◌
      </div>

      <h3>{title}</h3>

      <p>{text}</p>

      {action}
    </div>
  );
}

function PageLoader({
  text = "Loading..."
}) {
  return (
    <div className="loading-page">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

function PageError({
  message,
  onRetry
}) {
  return (
    <div className="page-error">
      <div className="page-error-icon">
        !
      </div>

      <h2>
        Unable to load this page
      </h2>

      <p>{message}</p>

      <Button
        variant="secondary"
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}

function InlineLoader() {
  return (
    <div className="inline-loader">
      <div className="spinner small-spinner" />
    </div>
  );
}

function ErrorBanner({
  message,
  onClose
}) {
  if (!message) return null;

  return (
    <div className="error-banner">
      <div>
        <strong>
          Something went wrong
        </strong>

        <span>{message}</span>
      </div>

      <button
        type="button"
        className="close-button"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}

function StatusBadge({
  status
}) {
  return (
    <span
      className={[
        "status-badge",
        statusClass(status)
      ].join(" ")}
    >
      {status || "Unknown"}
    </span>
  );
}

function ScoreBadge({
  score
}) {
  const value =
    Number(score || 0);

  return (
    <span
      className={[
        "score-badge",
        scoreClass(value)
      ].join(" ")}
    >
      {value.toFixed(0)}%
    </span>
  );
}

function StatCard({
  label,
  value,
  caption,
  icon
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-icon">
          {icon}
        </span>

        <span className="stat-label">
          {label}
        </span>
      </div>

      <strong>
        {value}
      </strong>

      {caption && (
        <span className="stat-caption">
          {caption}
        </span>
      )}
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
  width = "760px"
}) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className="modal"
        style={{
          maxWidth: width
        }}
      >
        <div className="modal-header">
          <h2>{title}</h2>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   AUTH
========================================================= */

function LoginScreen({
  onLogin
}) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const submit = async (
    event
  ) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const data =
        await apiRequest(
          "/login",
          {
            method: "POST",
            body: JSON.stringify({
              email,
              password
            })
          }
        );

      onLogin(data.user);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to sign in"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />

      <div className="auth-card">
        <div className="auth-mark">
          R
        </div>

        <div className="auth-brand">
          <span>
            RESEARCH MANAGEMENT
          </span>

          <h1>
            ResearchHub
          </h1>

          <p>
            PROJECT SYSTEM
          </p>
        </div>

        <div className="auth-heading">
          <h2>
            Welcome back
          </h2>

          <p>
            Sign in to manage
            research projects,
            applications, teams
            and progress.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={submit}
        >
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="you@example.com"
            required
          />

          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="Password"
            required
          />

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="auth-submit"
          >
            {loading
              ? "Signing in..."
              : "Sign in →"}
          </Button>
        </form>

        <div className="login-rule">
          <strong>
            Login rule
          </strong>

          <span>
            Password = part before @
          </span>

          <code>
            gowri@gmail.com → gowri
          </code>

          <small>
            New student accounts can
            enter their academic
            details after login.
          </small>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   APP SHELL
========================================================= */

function AppShell({
  user,
  activePage,
  setActivePage,
  onLogout,
  notificationCount,
  children
}) {
  const navItems =
    NAV[user.role] ||
    NAV.Student;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            R
          </div>

          <div>
            <strong>
              ResearchHub
            </strong>

            <span>
              Research management
            </span>
          </div>
        </div>

        <div className="sidebar-role">
          <span>
            CURRENT ROLE
          </span>

          <strong>
            {user.role}
          </strong>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(
            ([key, label, icon]) => (
              <button
                type="button"
                key={key}
                className={
                  activePage === key
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() =>
                  setActivePage(
                    key
                  )
                }
              >
                <span className="nav-icon">
                  {icon}
                </span>

                <span>
                  {label}
                </span>

                {key ===
                  "notifications" &&
                  notificationCount >
                    0 && (
                    <b className="nav-count">
                      {notificationCount}
                    </b>
                  )}
              </button>
            )
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar">
              {initials(
                user.full_name
              )}
            </div>

            <div>
              <strong>
                {user.full_name}
              </strong>

              <span>
                {user.email}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            className="logout-button"
            onClick={onLogout}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="topbar-kicker">
              RESEARCH PROJECT
              MANAGEMENT SYSTEM
            </div>

            <h1>
              {(
                navItems.find(
                  (item) =>
                    item[0] ===
                    activePage
                ) ||
                navItems[0]
              )[1]}
            </h1>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="notification-button"
              onClick={() =>
                setActivePage(
                  "notifications"
                )
              }
            >
              ◉

              {notificationCount >
                0 && (
                <span>
                  {
                    notificationCount
                  }
                </span>
              )}
            </button>

            <div className="topbar-user">
              <div className="avatar avatar-small">
                {initials(
                  user.full_name
                )}
              </div>

              <div>
                <strong>
                  {user.full_name}
                </strong>

                <span>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   PAGE INTRO
========================================================= */

function PageIntro({
  eyebrow,
  title,
  text,
  actions
}) {
  return (
    <div className="page-intro">
      <div>
        <span>
          {eyebrow}
        </span>

        <h2>{title}</h2>

        <p>{text}</p>
      </div>

      {actions && (
        <div className="page-intro-actions">
          {actions}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   STUDENT DASHBOARD
========================================================= */

function StudentDashboard({
  user,
  goTo
}) {
  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(
    `/dashboard/student/${user.student_id}`,
    Boolean(user.student_id)
  );
  

  const {
    data: assignedTasksData
  } = useFetchData(
    `/students/${user.student_id}/tasks`,
    Boolean(user.student_id)
  );

  if (loading) {
    return (
      <PageLoader text="Loading your dashboard..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const applications =
    safeArray(
      data?.applications
    );

  const teams =
    safeArray(data?.teams);

  const tasks =
  safeArray(assignedTasksData);

  const evaluations =
    safeArray(
      data?.evaluations
    );

  const notifications =
    safeArray(
      data?.notifications
    );

  const profileIncomplete =
    !user.register_number ||
    user.register_number ===
      "AUTO" ||
    user.semester ===
      undefined ||
    user.semester === null ||
    Number(user.semester) <= 0 ||
    user.cgpa ===
      undefined ||
    user.cgpa === null ||
    Number(user.cgpa) <= 0;

  const averageEvaluation =
    evaluations.length
      ? (
          evaluations.reduce(
            (sum, item) =>
              sum +
              Number(
                item.overall_score ||
                  0
              ),
            0
          ) /
          evaluations.length
        ).toFixed(1)
      : "—";

  const unread =
    notifications.filter(
      (item) =>
        !item.is_read
    );

  return (
    <>
      <PageIntro
        eyebrow="STUDENT OVERVIEW"
        title={`Good to see you, ${
          user.full_name?.split(
            " "
          )[0] ||
          "Student"
        }.`}
        text="Track your research applications, teams, tasks, milestones and faculty evaluations from one place."
        actions={
          <>
            <Button
              onClick={() =>
                goTo("projects")
              }
            >
              Browse projects
            </Button>

            <Button
              variant="secondary"
              onClick={() =>
                goTo(
                  "recommendations"
                )
              }
            >
              Recommendations
            </Button>
          </>
        }
      />

      {profileIncomplete && (
        <div className="profile-alert dashboard-profile-alert">
          <div className="profile-alert-icon">
            !
          </div>

          <div className="profile-alert-content">
            <strong>
              Complete your student
              profile
            </strong>

            <p>
              Your academic details
              are needed for project
              eligibility,
              compatibility and
              recommendations.
            </p>

            <Button
              small
              onClick={() =>
                goTo("profile")
              }
            >
              Complete profile
            </Button>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <StatCard
          label="Applications"
          value={
            applications.length
          }
          caption="Submitted projects"
          icon="✓"
        />

        <StatCard
          label="Teams"
          value={teams.length}
          caption="Current team memberships"
          icon="◇"
        />

        <StatCard
          label="Tasks"
          value={tasks.length}
          caption="Assigned work"
          icon="☷"
        />

        <StatCard
          label="Avg. evaluation"
          value={
            averageEvaluation ===
            "—"
              ? "—"
              : `${averageEvaluation}/10`
          }
          caption="Faculty feedback"
          icon="★"
        />
      </div>

      <div className="dashboard-grid">
        <Card
          title="Application snapshot"
          subtitle="Your latest applications"
          actions={
            <Button
              small
              variant="ghost"
              onClick={() =>
                goTo(
                  "applications"
                )
              }
            >
              View all
            </Button>
          }
        >
          {!applications.length ? (
            <EmptyState
              title="No applications yet"
              text="Browse approved projects and submit your first application."
              action={
                <Button
                  small
                  onClick={() =>
                    goTo(
                      "projects"
                    )
                  }
                >
                  Browse projects
                </Button>
              }
            />
          ) : (
            <div className="list">
              {applications
                .slice(0, 5)
                .map(
                  (item) => (
                    <div
                      className="list-row"
                      key={
                        item.application_id
                      }
                    >
                      <div>
                        <strong>
                          {
                            item.project_title
                          }
                        </strong>

                        <span>
                          Applied{" "}
                          {formatDate(
                            item.application_date
                          )}
                        </span>
                      </div>

                      <StatusBadge
                        status={
                          item.status
                        }
                      />
                    </div>
                  )
                )}
            </div>
          )}
        </Card>

        <Card
          title="My work"
          subtitle="Current assigned tasks"
          actions={
            <Button
              small
              variant="ghost"
              onClick={() =>
                goTo("tasks")
              }
            >
              Open tasks
            </Button>
          }
        >
          {!tasks.length ? (
            <EmptyState
              title="No tasks assigned"
              text="Tasks will appear here when a faculty member assigns work."
            />
          ) : (
            <div className="list">
              {tasks
                .slice(0, 5)
                .map(
                  (task) => (
                    <div
                      className="list-row"
                      key={
                        task.task_id
                      }
                    >
                      <div>
                        <strong>
                          {
                            task.task_title
                          }
                        </strong>

                        <span>
                          Due{" "}
                          {formatDate(
                            task.due_date
                          )}
                        </span>
                      </div>

                      <div className="mini-progress">
                        <span>
                          {
                            task.completion_percentage ??
                            0
                          }%
                        </span>

                        <div>
                          <i
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  Number(
                                    task.completion_percentage ||
                                      0
                                  )
                                )
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}
            </div>
          )}
        </Card>

        <Card
          title="Team memberships"
          subtitle="Current project assignments"
        >
          {!teams.length ? (
            <EmptyState
              title="No team assigned"
              text="Your team will appear here after you are selected for a project."
            />
          ) : (
            <div className="list">
              {teams.map(
                (team) => (
                  <div
                    className="list-row"
                    key={`${team.team_id}-${team.project_id}`}
                  >
                    <div>
                      <strong>
                        {
                          team.team_name
                        }
                      </strong>

                      <span>
                        {
                          team.project_title
                        }
                      </span>
                    </div>

                    <span className="pill">
                      {
                        team.member_role
                      }
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </Card>

        <Card
          title="Notifications"
          subtitle="Latest system activity"
          actions={
            <Button
              small
              variant="ghost"
              onClick={() =>
                goTo(
                  "notifications"
                )
              }
            >
              View all
            </Button>
          }
        >
          {!unread.length ? (
            <EmptyState
              title="You're all caught up"
              text="There are no unread notifications."
            />
          ) : (
            <div className="list">
              {unread
                .slice(0, 5)
                .map(
                  (item) => (
                    <div
                      className="notification-preview"
                      key={
                        item.notification_id
                      }
                    >
                      <span className="notification-dot" />

                      <div>
                        <strong>
                          {
                            item.title
                          }
                        </strong>

                        <span>
                          {
                            item.message
                          }
                        </span>

                        <small>
                          {formatDateTime(
                            item.created_at
                          )}
                        </small>
                      </div>
                    </div>
                  )
                )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/* =========================================================
   FACULTY DASHBOARD
========================================================= */

function FacultyDashboard({
  user,
  goTo
}) {
  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(
    `/dashboard/faculty/${user.faculty_id}`,
    Boolean(user.faculty_id)
  );

  if (loading) {
    return (
      <PageLoader text="Loading faculty dashboard..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const projects =
    safeArray(data?.projects);

  const applications =
    safeArray(
      data?.applications
    );

  const evaluations =
    safeArray(
      data?.evaluations
    );

  const issues =
    safeArray(data?.issues);

  const risks =
    safeArray(data?.risks);

  const pendingApplications =
    applications.filter(
      (item) =>
        String(item.status)
          .toLowerCase() ===
        "pending"
    );

  const pendingProjects =
    projects.filter(
      (item) =>
        item.status ===
        "Pending Approval"
    );

  const averageEvaluation =
    evaluations.length
      ? (
          evaluations.reduce(
            (sum, item) =>
              sum +
              Number(
                item.overall_score ||
                  0
              ),
            0
          ) /
          evaluations.length
        ).toFixed(1)
      : "—";

  return (
    <>
      <PageIntro
        eyebrow="FACULTY OVERVIEW"
        title={`Welcome, ${
          user.full_name
        }.`}
        text="Manage research projects, student applications, teams, milestones, tasks and evaluations."
        actions={
          <Button
            onClick={() =>
              goTo("projects")
            }
          >
            Manage projects
          </Button>
        }
      />

      <div className="stats-grid">
        <StatCard
          label="Projects"
          value={projects.length}
          caption="Owned projects"
          icon="◫"
        />

        <StatCard
          label="Pending applications"
          value={
            pendingApplications.length
          }
          caption="Need review"
          icon="✓"
        />

        <StatCard
          label="Pending proposals"
          value={
            pendingProjects.length
          }
          caption="Awaiting approval"
          icon="◌"
        />

        <StatCard
          label="Average evaluation"
          value={
            averageEvaluation ===
            "—"
              ? "—"
              : `${averageEvaluation}/10`
          }
          caption="Across evaluations"
          icon="★"
        />
      </div>

      <div className="dashboard-grid">
        <Card
          title="Your projects"
          subtitle="Latest research projects"
          actions={
            <Button
              small
              variant="ghost"
              onClick={() =>
                goTo("projects")
              }
            >
              View all
            </Button>
          }
        >
          {!projects.length ? (
            <EmptyState
              title="No projects yet"
              text="Create your first research project proposal."
            />
          ) : (
            <div className="list">
              {projects
                .slice(0, 6)
                .map(
                  (project) => (
                    <div
                      className="list-row"
                      key={
                        project.project_id
                      }
                    >
                      <div>
                        <strong>
                          {
                            project.project_title
                          }
                        </strong>

                        <span>
                          Deadline{" "}
                          {formatDate(
                            project.application_deadline
                          )}
                        </span>
                      </div>

                      <StatusBadge
                        status={
                          project.status
                        }
                      />
                    </div>
                  )
                )}
            </div>
          )}
        </Card>

        <Card
          title="Applications"
          subtitle="Latest student applications"
          actions={
            <Button
              small
              variant="ghost"
              onClick={() =>
                goTo(
                  "applications"
                )
              }
            >
              Review
            </Button>
          }
        >
          {!applications.length ? (
            <EmptyState
              title="No applications"
              text="Student applications will appear here."
            />
          ) : (
            <div className="list">
              {applications
                .slice(0, 6)
                .map(
                  (item) => (
                    <div
                      className="list-row"
                      key={
                        item.application_id
                      }
                    >
                      <div>
                        <strong>
                          {
                            item.student_name
                          }
                        </strong>

                        <span>
                          {
                            item.project_title
                          }
                        </span>
                      </div>

                      <StatusBadge
                        status={
                          item.status
                        }
                      />
                    </div>
                  )
                )}
            </div>
          )}
        </Card>

        <Card
          title="Open issues"
          subtitle="Issues across your projects"
          actions={
            <Button
              small
              variant="ghost"
              onClick={() =>
                goTo("issues")
              }
            >
              Manage
            </Button>
          }
        >
          <div className="metric-number">
            {issues.filter(
              (item) =>
                ![
                  "Resolved",
                  "Closed"
                ].includes(
                  item.status
                )
            ).length}
          </div>

          <p className="muted-text">
            Active issues
          </p>
        </Card>

        <Card
          title="Active risks"
          subtitle="Risk register"
          actions={
            <Button
              small
              variant="ghost"
              onClick={() =>
                goTo("risks")
              }
            >
              Manage
            </Button>
          }
        >
          <div className="metric-number">
            {risks.filter(
              (item) =>
                ![
                  "Resolved",
                  "Closed"
                ].includes(
                  item.status
                )
            ).length}
          </div>

          <p className="muted-text">
            Active risks
          </p>
        </Card>
      </div>
    </>
  );
}

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

function AdminDashboard({
  goTo
}) {
  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(
    "/dashboard/admin"
  );

  if (loading) {
    return (
      <PageLoader text="Loading admin dashboard..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <>
      <PageIntro
        eyebrow="ADMINISTRATION"
        title="ResearchHub control centre"
        text="Monitor users, projects, applications, resources and operational activity."
      />

      <div className="stats-grid">
        <StatCard
          label="Users"
          value={
            data?.total_users ?? 0
          }
          caption="All registered users"
          icon="◉"
        />

        <StatCard
          label="Students"
          value={
            data?.total_students ??
            0
          }
          caption="Student accounts"
          icon="♙"
        />

        <StatCard
          label="Faculty"
          value={
            data?.total_faculty ?? 0
          }
          caption="Faculty accounts"
          icon="♧"
        />

        <StatCard
          label="Projects"
          value={
            data?.total_projects ??
            0
          }
          caption="Research projects"
          icon="◫"
        />

        <StatCard
          label="Applications"
          value={
            data?.total_applications ??
            0
          }
          caption="Submitted applications"
          icon="✓"
        />

        <StatCard
          label="Teams"
          value={
            data?.total_teams ?? 0
          }
          caption="Project teams"
          icon="◇"
        />

        <StatCard
          label="Pending approvals"
          value={
            data?.pending_project_approvals ??
            0
          }
          caption="Need action"
          icon="◌"
        />

        <StatCard
          label="Open issues"
          value={
            data?.open_issues ?? 0
          }
          caption="Active issues"
          icon="⚠"
        />
      </div>

      <div className="quick-grid">
        <QuickAction
          title="Review approvals"
          text="Approve or reject project proposals."
          icon="✓"
          onClick={() =>
            goTo("approvals")
          }
        />

        <QuickAction
          title="Manage users"
          text="View registered users."
          icon="◉"
          onClick={() =>
            goTo("users")
          }
        />

        <QuickAction
          title="Open reports"
          text="View system analytics."
          icon="▤"
          onClick={() =>
            goTo("reports")
          }
        />

        <QuickAction
          title="Manage resources"
          text="Monitor resources and requests."
          icon="▣"
          onClick={() =>
            goTo("resources")
          }
        />
      </div>
    </>
  );
}

function QuickAction({
  title,
  text,
  icon,
  onClick
}) {
  return (
    <button
      type="button"
      className="quick-action"
      onClick={onClick}
    >
      <span className="quick-icon">
        {icon}
      </span>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>
      </div>

      <b>→</b>
    </button>
  );
}

/* =========================================================
   PROJECTS
========================================================= */

function ProjectsPage({
  user,
  goTo
}) {
  const isFaculty =
    user.role ===
    ROLE.FACULTY;

  const isAdmin =
    user.role ===
    ROLE.ADMIN;

  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(
    "/projects"
  );

  const [
    search,
    setSearch
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter
  ] = useState("");

  const [
    createOpen,
    setCreateOpen
  ] = useState(false);

  const [
    editProject,
    setEditProject
  ] = useState(null);

  const [
    selectedProject,
    setSelectedProject
  ] = useState(null);

  if (loading) {
    return (
      <PageLoader text="Loading projects..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const projects =
    safeArray(data).filter(
      (project) => {
        const searchText =
          `${project.project_title || ""} ${
            project.project_description ||
            ""
          } ${
            project.faculty_name ||
            ""
          }`;

        const matchesSearch =
          !search ||
          searchText
            .toLowerCase()
            .includes(
              search.toLowerCase()
            );

        const matchesStatus =
          !statusFilter ||
          project.status ===
            statusFilter;

        const matchesFaculty =
          !isFaculty ||
          Number(
            project.faculty_id
          ) ===
            Number(
              user.faculty_id
            );

        return (
          matchesSearch &&
          matchesStatus &&
          matchesFaculty
        );
      }
    );

  return (
    <>
      <PageIntro
        eyebrow={
          isFaculty
            ? "FACULTY PROJECTS"
            : isAdmin
              ? "PROJECT ADMINISTRATION"
              : "RESEARCH PROJECTS"
        }
        title={
          isFaculty
            ? "Manage your research projects"
            : "Find your next research project"
        }
        text={
          isFaculty
            ? "Create proposals, monitor status and manage the projects you supervise."
            : "Browse research projects and explore their eligibility, deadlines and requirements."
        }
        actions={
          isFaculty ? (
            <Button
              onClick={() =>
                setCreateOpen(true)
              }
            >
              + New project
            </Button>
          ) : null
        }
      />

      <Card className="filter-card">
        <div className="filter-row">
          <input
            className="search-input"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search projects, faculty or topics..."
          />

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="">
              All statuses
            </option>

            {PROJECT_STATUS.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              )
            )}
          </select>
        </div>
      </Card>

      {!projects.length ? (
        <EmptyState
          title="No projects found"
          text="Try changing your search or filters."
          action={
            isFaculty ? (
              <Button
                onClick={() =>
                  setCreateOpen(
                    true
                  )
                }
              >
                Create project
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="project-grid">
          {projects.map(
            (project) => (
              <ProjectCard
                key={
                  project.project_id
                }
                project={project}
                user={user}
                onView={() =>
                  setSelectedProject(
                    project
                  )
                }
                onEdit={() =>
                  setEditProject(
                    project
                  )
                }
              />
            )
          )}
        </div>
      )}

      <ProjectCreateModal
        open={createOpen}
        user={user}
        onClose={() =>
          setCreateOpen(false)
        }
        onSuccess={() => {
          setCreateOpen(false);
          reload();
        }}
      />

      <ProjectEditModal
        project={editProject}
        onClose={() =>
          setEditProject(null)
        }
        onSuccess={() => {
          setEditProject(null);
          reload();
        }}
      />

      <ProjectDetailsModal
        project={selectedProject}
        user={user}
        goTo={goTo}
        onClose={() =>
          setSelectedProject(
            null
          )
        }
        onChanged={reload}
      />
    </>
  );
}

function ProjectCard({
  project,
  user,
  onView,
  onEdit
}) {
  const isFaculty =
    user.role ===
    ROLE.FACULTY;

  const score =
    Number(
      project.total_score ||
        project.compatibility_score ||
        0
    );

  return (
    <article className="project-card">
      <div className="project-card-top">
        <StatusBadge
          status={project.status}
        />

        {score > 0 && (
          <ScoreBadge
            score={score}
          />
        )}
      </div>

      <h3>
        {project.project_title}
      </h3>

      <p className="project-description">
        {project.project_description ||
          "No project description provided."}
      </p>

      <div className="project-meta">
        <span>
          <b>Faculty</b>
          {project.faculty_name ||
            "—"}
        </span>

        <span>
          <b>CGPA</b>
          {project.minimum_cgpa ??
            0}
          +
        </span>

        <span>
          <b>Team</b>
          Up to{" "}
          {project.maximum_team_size ??
            "—"}
        </span>

        <span>
          <b>Deadline</b>
          {formatDate(
            project.application_deadline
          )}
        </span>
      </div>

      <div className="project-actions">
        <Button
          small
          variant="secondary"
          onClick={onView}
        >
          View
        </Button>

        {isFaculty && (
          <Button
            small
            variant="ghost"
            onClick={onEdit}
          >
            Edit
          </Button>
        )}
      </div>
    </article>
  );
}

/* =========================================================
   PROJECT CREATE / EDIT / DETAILS
========================================================= */

function ProjectCreateModal({
  open,
  user,
  onClose,
  onSuccess
}) {
  const {
    data: departments
  } =
    useFetchData(
      "/departments",
      open
    );

  const [
    form,
    setForm
  ] = useState({
    department_id: "",
    project_title: "",
    project_description: "",
    minimum_cgpa: "6",
    maximum_team_size: "4",
    application_deadline: ""
  });

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const update =
    (key, value) =>
      setForm(
        (prev) => ({
          ...prev,
          [key]: value
        })
      );

  const submit =
    async (event) => {
      event.preventDefault();

      setLoading(true);
      setError("");

      try {
        await apiRequest(
          "/projects",
          {
            method: "POST",
            body: JSON.stringify({
              faculty_id:
                user.faculty_id,

              department_id:
                Number(
                  form.department_id
                ),

              project_title:
                form.project_title,

              project_description:
                form.project_description,

              minimum_cgpa:
                Number(
                  form.minimum_cgpa
                ),

              maximum_team_size:
                Number(
                  form.maximum_team_size
                ),

              application_deadline:
                form.application_deadline ||
                null
            })
          }
        );

        onSuccess();
      } catch (err) {
        setError(
          err?.message ||
            "Failed to create project"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <Modal
      open={open}
      title="Create research project"
      onClose={onClose}
    >
      <form
        className="form-grid"
        onSubmit={submit}
      >
        <Field
          label="Project title"
          value={
            form.project_title
          }
          onChange={(value) =>
            update(
              "project_title",
              value
            )
          }
          placeholder="e.g. AI-Based Medical Imaging"
          required
        />

        <label className="field">
          <span>
            Department <em>*</em>
          </span>

          <select
            value={
              form.department_id
            }
            onChange={(event) =>
              update(
                "department_id",
                event.target.value
              )
            }
            required
          >
            <option value="">
              Select Department
            </option>

            {safeArray(
              departments
            ).map(
              (department) => (
                <option
                  key={
                    department.department_id
                  }
                  value={
                    department.department_id
                  }
                >
                  {
                    department.department_name
                  }
                </option>
              )
            )}
          </select>
        </label>

        <Field
          label="Minimum CGPA"
          value={
            form.minimum_cgpa
          }
          onChange={(value) =>
            update(
              "minimum_cgpa",
              value
            )
          }
          type="number"
          min="0"
          max="10"
          step="0.01"
        />

        <Field
          label="Maximum team size"
          value={
            form.maximum_team_size
          }
          onChange={(value) =>
            update(
              "maximum_team_size",
              value
            )
          }
          type="number"
          min="1"
          max="50"
          required
        />

        <Field
          label="Application deadline"
          value={
            form.application_deadline
          }
          onChange={(value) =>
            update(
              "application_deadline",
              value
            )
          }
          type="date"
        />

        <Field
          label="Project description"
          value={
            form.project_description
          }
          onChange={(value) =>
            update(
              "project_description",
              value
            )
          }
          textarea
          placeholder="Describe the research project..."
        />

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create proposal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectEditModal({
  project,
  onClose,
  onSuccess
}) {
  const [
    form,
    setForm
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(false);

  useEffect(() => {
    if (!project) {
      setForm(null);
      return;
    }

    setForm({
      project_title:
        project.project_title ||
        "",

      project_description:
        project.project_description ||
        "",

      minimum_cgpa:
        project.minimum_cgpa ??
        "",

      maximum_team_size:
        project.maximum_team_size ??
        "",

      application_deadline:
        project.application_deadline
          ? String(
              project.application_deadline
            ).slice(0, 10)
          : "",

      status:
        project.status || ""
    });
  }, [project]);

  if (!project || !form) {
    return null;
  }

  const update =
    (key, value) =>
      setForm(
        (prev) => ({
          ...prev,
          [key]: value
        })
      );

  const submit =
    async (event) => {
      event.preventDefault();

      setLoading(true);

      try {
        await apiRequest(
          `/projects/${project.project_id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              project_title:
                form.project_title,

              project_description:
                form.project_description,

              minimum_cgpa:
                Number(
                  form.minimum_cgpa
                ),

              maximum_team_size:
                Number(
                  form.maximum_team_size
                ),

              application_deadline:
                form.application_deadline ||
                null,

              status:
                form.status
            })
          }
        );

        onSuccess();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to update project"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <Modal
      open={Boolean(project)}
      title="Edit project"
      onClose={onClose}
    >
      <form
        className="form-grid"
        onSubmit={submit}
      >
        <Field
          label="Project title"
          value={
            form.project_title
          }
          onChange={(value) =>
            update(
              "project_title",
              value
            )
          }
          required
        />

        <Field
          label="Status"
          value={form.status}
          onChange={(value) =>
            update(
              "status",
              value
            )
          }
          options={PROJECT_STATUS}
        />

        <Field
          label="Minimum CGPA"
          value={
            form.minimum_cgpa
          }
          onChange={(value) =>
            update(
              "minimum_cgpa",
              value
            )
          }
          type="number"
          min="0"
          max="10"
          step="0.01"
        />

        <Field
          label="Maximum team size"
          value={
            form.maximum_team_size
          }
          onChange={(value) =>
            update(
              "maximum_team_size",
              value
            )
          }
          type="number"
          min="1"
        />

        <Field
          label="Application deadline"
          value={
            form.application_deadline
          }
          onChange={(value) =>
            update(
              "application_deadline",
              value
            )
          }
          type="date"
        />

        <Field
          label="Description"
          value={
            form.project_description
          }
          onChange={(value) =>
            update(
              "project_description",
              value
            )
          }
          textarea
        />

        <div className="modal-actions">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectDetailsModal({
  project,
  user,
  goTo,
  onClose,
  onChanged
}) {
  const [
    score,
    setScore
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState("");

  useEffect(() => {
    if (!project) {
      setScore(null);
      setMessage("");
      return;
    }

    if (
      user.role ===
        ROLE.STUDENT &&
      user.student_id
    ) {
      apiRequest(
        `/compatibility/student/${user.student_id}/project/${project.project_id}`
      )
        .then((data) =>
          setScore(data)
        )
        .catch(() =>
          setScore(null)
        );
    }
  }, [
    project,
    user.role,
    user.student_id
  ]);

  if (!project) {
    return null;
  }

  const studentProfileIncomplete =
    user.role ===
      ROLE.STUDENT &&
    (
      !user.register_number ||
      user.register_number ===
        "AUTO" ||
      !user.semester ||
      Number(user.cgpa || 0) <= 0
    );

  const apply =
    async () => {
      if (
        studentProfileIncomplete
      ) {
        setMessage(
          "Please complete your student profile with your actual CGPA, semester and registration number before applying."
        );
        return;
      }

      setLoading(true);
      setMessage("");

      try {
        await apiRequest(
          "/applications",
          {
            method: "POST",
            body: JSON.stringify({
              student_id:
                user.student_id,
              project_id:
                project.project_id
            })
          }
        );

        setMessage(
          "Application submitted successfully."
        );

        onChanged?.();
      } catch (err) {
        setMessage(
          err?.message ||
            "Could not submit application."
        );
      } finally {
        setLoading(false);
      }
    };

  const addPreference =
    async () => {
      if (
        studentProfileIncomplete
      ) {
        setMessage(
          "Complete your academic profile first."
        );
        return;
      }

      setLoading(true);
      setMessage("");

      try {
        await apiRequest(
          "/preferences",
          {
            method: "POST",
            body: JSON.stringify({
              student_id:
                user.student_id,
              project_id:
                project.project_id,
              preference_rank: 1
            })
          }
        );

        setMessage(
          "Project added as your #1 preference."
        );
      } catch (err) {
        setMessage(
          err?.message ||
            "Could not save preference."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <Modal
      open={Boolean(project)}
      title={
        project.project_title
      }
      onClose={onClose}
      width="920px"
    >
      <div className="detail-layout">
        <div>
          <div className="detail-status-row">
            <StatusBadge
              status={
                project.status
              }
            />

            {score && (
              <ScoreBadge
                score={
                  score.total_score
                }
              />
            )}
          </div>

          <p className="detail-description">
            {project.project_description ||
              "No description provided."}
          </p>

          <div className="detail-grid">
            <DetailItem
              label="Faculty"
              value={
                project.faculty_name ||
                "—"
              }
            />

            <DetailItem
              label="Department"
              value={
                project.department_name ||
                "—"
              }
            />

            <DetailItem
              label="Minimum CGPA"
              value={
                project.minimum_cgpa ??
                0
              }
            />

            <DetailItem
              label="Maximum team size"
              value={
                project.maximum_team_size ||
                "—"
              }
            />

            <DetailItem
              label="Application deadline"
              value={formatDate(
                project.application_deadline
              )}
            />

            <DetailItem
              label="Project ID"
              value={
                project.project_id
              }
            />
          </div>

          {score && (
            <div className="score-breakdown">
              <h4>
                Compatibility score
              </h4>

              <ScoreLine
                label="Skills"
                value={
                  score.skill_score
                }
                max={40}
              />

              <ScoreLine
                label="CGPA"
                value={
                  score.cgpa_score
                }
                max={25}
              />

              <ScoreLine
                label="Preference"
                value={
                  score.preference_score
                }
                max={20}
              />

              <ScoreLine
                label="Experience"
                value={
                  score.experience_score
                }
                max={15}
              />

              <div className="score-total">
                <span>
                  Total
                </span>

                <strong>
                  {
                    score.total_score
                  }%
                </strong>
              </div>

              <div
                className={
                  score.eligible
                    ? "eligibility okay"
                    : "eligibility not-okay"
                }
              >
                {score.eligible
                  ? "✓ Eligible for this project"
                  : "✕ Your current CGPA does not meet the project requirement"}
              </div>
            </div>
          )}
        </div>

        <div className="detail-side-card">
          <span className="topbar-kicker">
            ACTIONS
          </span>

          {user.role ===
            ROLE.STUDENT && (
            <>
              {studentProfileIncomplete && (
                <div className="side-profile-warning">
                  Complete your profile
                  first so ResearchHub
                  can verify your
                  eligibility.
                </div>
              )}

              <Button
                disabled={loading}
                onClick={apply}
              >
                Apply now
              </Button>

              <Button
                variant="secondary"
                disabled={loading}
                onClick={
                  addPreference
                }
              >
                Add to preferences
              </Button>

              {studentProfileIncomplete && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    goTo?.("profile");
                  }}
                >
                  Complete profile
                </Button>
              )}
            </>
          )}

          {message && (
            <div className="action-message">
              {message}
            </div>
          )}

          <div className="side-note">
            Eligibility is calculated
            using the academic details
            stored in your student
            profile.
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DetailItem({
  label,
  value
}) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScoreLine({
  label,
  value,
  max
}) {
  const percentage =
    max > 0
      ? (Number(value || 0) /
          max) *
        100
      : 0;

  return (
    <div className="score-line">
      <div>
        <span>
          {label}
        </span>

        <strong>
          {Number(
            value || 0
          ).toFixed(1)}
          /{max}
        </strong>
      </div>

      <div className="progress-track">
        <i
          style={{
            width: `${Math.min(
              100,
              percentage
            )}%`
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   RECOMMENDATIONS
========================================================= */

function RecommendationsPage({
  user
}) {
  const student =
    user.role ===
    ROLE.STUDENT;

  const endpoint = student
    ? `/recommendations/projects/${user.student_id}`
    : `/faculty/${user.faculty_id}/recommendations`;

  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(endpoint);

  if (loading) {
    return (
      <PageLoader text="Generating recommendations..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const rows =
    safeArray(data);

  return (
    <>
      <PageIntro
        eyebrow="SMART RECOMMENDATIONS"
        title={
          student
            ? "Projects matched to you"
            : "Students matched to your projects"
        }
        text={
          student
            ? "Matches use skills, CGPA, preferences and previous project experience."
            : "Students are ranked against the requirements of your research projects."
        }
      />

      {!rows.length ? (
        <EmptyState
          title="No recommendations yet"
          text={
            student
              ? "Add your skills and preferences to make recommendations more useful."
              : "Generate recommendations after adding students and project requirements."
          }
        />
      ) : (
        <div className="recommendation-list">
          {rows.map(
            (item, index) => (
              <Card
                key={
                  item.recommendation_id ||
                  `${item.student_id}-${item.project_id}`
                }
                className="recommendation-card"
              >
                <div className="recommendation-rank">
                  #{index + 1}
                </div>

                <div className="recommendation-main">
                  <div className="recommendation-title">
                    <h3>
                      {student
                        ? item.project_title
                        : item.student_name ||
                          item.full_name ||
                          "Student"}
                    </h3>

                    <ScoreBadge
                      score={
                        item.total_score
                      }
                    />
                  </div>

                  <p>
                    {item.recommendation_reason ||
                      `Compatibility ${item.total_score}%`}
                  </p>

                  <div className="score-bars-row">
                    <MiniScore
                      label="Skills"
                      value={
                        item.skill_score
                      }
                      max={40}
                    />

                    <MiniScore
                      label="CGPA"
                      value={
                        item.cgpa_score
                      }
                      max={25}
                    />

                    <MiniScore
                      label="Preference"
                      value={
                        item.preference_score
                      }
                      max={20}
                    />

                    <MiniScore
                      label="Experience"
                      value={
                        item.experience_score
                      }
                      max={15}
                    />
                  </div>
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </>
  );
}

function MiniScore({
  label,
  value,
  max
}) {
  return (
    <div className="mini-score">
      <span>{label}</span>

      <strong>
        {Number(
          value || 0
        ).toFixed(0)}
        /{max}
      </strong>
    </div>
  );
}

/* =========================================================
   APPLICATIONS
========================================================= */

function ApplicationsPage({
  user
}) {
  const isStudent =
    user.role ===
    ROLE.STUDENT;

  const endpoint = isStudent
    ? `/students/${user.student_id}/applications`
    : `/faculty/${user.faculty_id}/applications`;

  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(endpoint);

  const [
    updating,
    setUpdating
  ] = useState(null);

  if (loading) {
    return (
      <PageLoader text="Loading applications..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const applications =
    safeArray(data);

  const review =
    async (
      applicationId,
      status
    ) => {
      setUpdating(
        applicationId
      );

      try {
        await apiRequest(
          `/applications/${applicationId}/review`,
          {
            method: "PUT",
            body: JSON.stringify({
              status
            })
          }
        );

        reload();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to update application"
        );
      } finally {
        setUpdating(null);
      }
    };

  return (
    <>
      <PageIntro
        eyebrow={
          isStudent
            ? "APPLICATION TRACKER"
            : "APPLICATION REVIEW"
        }
        title={
          isStudent
            ? "Track your applications"
            : "Review student applications"
        }
        text={
          isStudent
            ? "See the current status of every project application."
            : "Review applications submitted to your research projects."
        }
      />

      <Card className="table-card">
        {!applications.length ? (
          <EmptyState
            title="No applications"
            text={
              isStudent
                ? "You have not applied to any projects yet."
                : "No student applications have been submitted yet."
            }
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>
                    {isStudent
                      ? "Project"
                      : "Student"}
                  </th>

                  <th>
                    {isStudent
                      ? "Faculty"
                      : "Project"}
                  </th>

                  <th>
                    CGPA
                  </th>

                  <th>
                    Applied
                  </th>

                  <th>
                    Status
                  </th>

                  {!isStudent && (
                    <th>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {applications.map(
                  (item) => (
                    <tr
                      key={
                        item.application_id
                      }
                    >
                      <td>
                        <strong>
                          {isStudent
                            ? item.project_title
                            : item.student_name}
                        </strong>

                        {!isStudent &&
                          item.register_number && (
                            <small>
                              {
                                item.register_number
                              }
                            </small>
                          )}
                      </td>

                      <td>
                        {isStudent
                          ? item.faculty_name ||
                            "—"
                          : item.project_title}
                      </td>

                      <td>
                        {item.cgpa ??
                          "—"}
                      </td>

                      <td>
                        {formatDate(
                          item.application_date
                        )}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            item.status
                          }
                        />
                      </td>

                      {!isStudent && (
                        <td>
                          <div className="table-actions">
                            <Button
                              small
                              disabled={
                                updating ===
                                item.application_id
                              }
                              onClick={() =>
                                review(
                                  item.application_id,
                                  "Accepted"
                                )
                              }
                            >
                              Accept
                            </Button>

                            <Button
                              small
                              variant="danger"
                              disabled={
                                updating ===
                                item.application_id
                              }
                              onClick={() =>
                                review(
                                  item.application_id,
                                  "Rejected"
                                )
                              }
                            >
                              Reject
                            </Button>

                            <Button
                              small
                              variant="secondary"
                              disabled={
                                updating ===
                                item.application_id
                              }
                              onClick={() =>
                                review(
                                  item.application_id,
                                  "Waitlisted"
                                )
                              }
                            >
                              Waitlist
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* =========================================================
   PREFERENCES
========================================================= */

function PreferencesPage({
  user
}) {
  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(
    `/preferences/student/${user.student_id}`
  );

  const {
    data: projects
  } = useFetchData(
    "/projects/status/approved"
  );

  const [
    projectId,
    setProjectId
  ] = useState("");

  const [
    rank,
    setRank
  ] = useState("1");

  const [
    saving,
    setSaving
  ] = useState(false);

  const preferences =
    safeArray(data);

  const projectOptions =
    safeArray(projects);

  const save =
    async (event) => {
      event.preventDefault();

      if (!projectId) {
        return;
      }

      setSaving(true);

      try {
        await apiRequest(
          "/preferences",
          {
            method: "POST",
            body: JSON.stringify({
              student_id:
                user.student_id,
              project_id:
                Number(projectId),
              preference_rank:
                Number(rank)
            })
          }
        );

        setProjectId("");
        reload();
      } catch (err) {
        window.alert(
          err?.message ||
            "Could not save preference"
        );
      } finally {
        setSaving(false);
      }
    };

  const remove =
    async (id) => {
      try {
        await apiRequest(
          `/preferences/${id}`,
          {
            method: "DELETE"
          }
        );

        reload();
      } catch (err) {
        window.alert(
          err?.message ||
            "Could not remove preference"
        );
      }
    };

  if (loading) {
    return (
      <PageLoader text="Loading preferences..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <>
      <PageIntro
        eyebrow="PROJECT PREFERENCES"
        title="Build your priority list"
        text="Rank projects you are interested in. Your preferences contribute to compatibility scoring."
      />

      <div className="two-column-layout">
        <Card
          title="Add a preference"
          subtitle="Choose a project and assign a rank"
        >
          <form
            className="stack-form"
            onSubmit={save}
          >
            <label className="field">
              <span>
                Project <em>*</em>
              </span>

              <select
                value={projectId}
                onChange={(event) =>
                  setProjectId(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select Project
                </option>

                {projectOptions.map(
                  (project) => (
                    <option
                      key={
                        project.project_id
                      }
                      value={
                        project.project_id
                      }
                    >
                      {
                        project.project_title
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <Field
              label="Preference rank"
              value={rank}
              onChange={setRank}
              type="number"
              min="1"
              max="20"
              required
            />

            <Button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save preference"}
            </Button>
          </form>
        </Card>

        <Card
          title="Your preferences"
          subtitle="Lower rank means higher priority"
        >
          {!preferences.length ? (
            <EmptyState
              title="No preferences"
              text="Add project preferences to improve recommendation quality."
            />
          ) : (
            <div className="preference-list">
              {preferences.map(
                (item) => (
                  <div
                    className="preference-row"
                    key={
                      item.preference_id
                    }
                  >
                    <div className="rank-circle">
                      {
                        item.preference_rank
                      }
                    </div>

                    <div>
                      <strong>
                        {
                          item.project_title
                        }
                      </strong>

                      <span>
                        {item.status ||
                          "Project"}
                      </span>
                    </div>

                    <Button
                      small
                      variant="ghost"
                      onClick={() =>
                        remove(
                          item.preference_id
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/* =========================================================
   SKILLS
========================================================= */

function SkillsPage({
  user
}) {
  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(
    `/students/${user.student_id}/skills`
  );

  const {
    data: allSkills
  } = useFetchData(
    "/skills"
  );

  const [
    skillId,
    setSkillId
  ] = useState("");

  const [
    proficiency,
    setProficiency
  ] = useState(
    "Intermediate"
  );

  const [
    saving,
    setSaving
  ] = useState(false);

  if (loading) {
    return (
      <PageLoader text="Loading skills..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const skills =
    safeArray(data);

  const save =
    async (event) => {
      event.preventDefault();

      if (!skillId) {
        return;
      }

      setSaving(true);

      try {
        await apiRequest(
          "/student-skills",
          {
            method: "POST",
            body: JSON.stringify({
              student_id:
                user.student_id,
              skill_id:
                Number(skillId),
              proficiency_level:
                proficiency
            })
          }
        );

        setSkillId("");
        reload();
      } catch (err) {
        window.alert(
          err?.message ||
            "Could not add skill"
        );
      } finally {
        setSaving(false);
      }
    };

  const remove =
    async (id) => {
      try {
        await apiRequest(
          `/student-skills/${id}`,
          {
            method: "DELETE"
          }
        );

        reload();
      } catch (err) {
        window.alert(
          err?.message ||
            "Could not remove skill"
        );
      }
    };

  return (
    <>
      <PageIntro
        eyebrow="SKILLS PROFILE"
        title="Your research skills"
        text="Keep your skills up to date. They influence compatibility and recommendations."
      />

      <div className="two-column-layout">
        <Card
          title="Add a skill"
          subtitle="Record your proficiency"
        >
          <form
            className="stack-form"
            onSubmit={save}
          >
            <label className="field">
              <span>
                Skill <em>*</em>
              </span>

              <select
                value={skillId}
                onChange={(event) =>
                  setSkillId(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select Skill
                </option>

                {safeArray(
                  allSkills
                ).map(
                  (skill) => (
                    <option
                      key={
                        skill.skill_id
                      }
                      value={
                        skill.skill_id
                      }
                    >
                      {
                        skill.skill_name
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <Field
              label="Proficiency"
              value={
                proficiency
              }
              onChange={
                setProficiency
              }
              options={[
                "Beginner",
                "Intermediate",
                "Advanced"
              ]}
              required
            />

            <Button
              type="submit"
              disabled={saving}
            >
              Add skill
            </Button>
          </form>
        </Card>

        <Card
          title="Current skills"
          subtitle={`${skills.length} recorded`}
        >
          {!skills.length ? (
            <EmptyState
              title="No skills added"
              text="Add your skills to improve compatibility."
            />
          ) : (
            <div className="skill-list">
              {skills.map(
                (skill) => (
                  <div
                    className="skill-row"
                    key={
                      skill.student_skill_id
                    }
                  >
                    <div>
                      <strong>
                        {
                          skill.skill_name
                        }
                      </strong>

                      <span>
                        {
                          skill.skill_category ||
                          "General"
                        }
                      </span>
                    </div>

                    <div className="skill-actions">
                      <span className="pill">
                        {
                          skill.proficiency_level
                        }
                      </span>

                      <Button
                        small
                        variant="ghost"
                        onClick={() =>
                          remove(
                            skill.student_skill_id
                          )
                        }
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/* =========================================================
   TEAMS
========================================================= */

function TeamsPage({
  user
}) {
  const [
    teams,
    setTeams
  ] = useState([]);

  const [
    projects,
    setProjects
  ] = useState([]);

  const [
    selectedTeam,
    setSelectedTeam
  ] = useState(null);

  const [
    createOpen,
    setCreateOpen
  ] = useState(false);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState("");

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          let result = [];

          if (
            user.role ===
            ROLE.STUDENT
          ) {
            result =
              await apiRequest(
                `/students/${user.student_id}/teams`
              );
          } else if (
            user.role ===
            ROLE.FACULTY
          ) {
            const [
              allTeams,
              facultyProjects
            ] =
              await Promise.all([
                apiRequest(
                  "/teams"
                ),
                apiRequest(
                  `/faculty/${user.faculty_id}/projects`
                )
              ]);

            const ids =
              new Set(
                safeArray(
                  facultyProjects
                ).map(
                  (project) =>
                    Number(
                      project.project_id
                    )
                )
              );

            result =
              safeArray(
                allTeams
              ).filter(
                (team) =>
                  ids.has(
                    Number(
                      team.project_id
                    )
                  )
              );

            setProjects(
              safeArray(
                facultyProjects
              )
            );
          } else {
            result =
              await apiRequest(
                "/teams"
              );
          }

          setTeams(
            safeArray(result)
          );
        } catch (err) {
          setError(
            err?.message ||
              "Failed to load teams"
          );
        } finally {
          setLoading(false);
        }
      },
      [
        user.role,
        user.student_id,
        user.faculty_id
      ]
    );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <PageLoader text="Loading teams..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={load}
      />
    );
  }

  const viewTeam =
    async (teamId) => {
      try {
        const result =
          await apiRequest(
            `/teams/${teamId}`
          );

        setSelectedTeam(
          result
        );
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to load team"
        );
      }
    };

  return (
    <>
      <PageIntro
        eyebrow="TEAM MANAGEMENT"
        title={
          user.role ===
          ROLE.STUDENT
            ? "Your research teams"
            : "Research project teams"
        }
        text={
          user.role ===
          ROLE.STUDENT
            ? "View your project team and assigned role."
            : "Create teams manually or form them using compatibility-based smart selection."
        }
        actions={
          user.role ===
          ROLE.FACULTY ? (
            <Button
              onClick={() =>
                setCreateOpen(
                  true
                )
              }
            >
              + Create team
            </Button>
          ) : null
        }
      />

      {!teams.length ? (
        <EmptyState
          title="No teams yet"
          text={
            user.role ===
            ROLE.STUDENT
              ? "You have not been assigned to a project team yet."
              : "No teams have been created for your projects."
          }
        />
      ) : (
        <div className="team-grid">
          {teams.map(
            (team) => (
              <Card
                key={
                  team.team_id
                }
                className="team-card"
              >
                <div className="team-card-heading">
                  <div className="team-avatar">
                    ◇
                  </div>

                  <div>
                    <h3>
                      {
                        team.team_name
                      }
                    </h3>

                    <span>
                      {
                        team.project_title
                      }
                    </span>
                  </div>
                </div>

                <div className="team-card-meta">
                  <span>
                    <b>Role</b>
                    {
                      team.member_role ||
                      team.formation_type ||
                      "—"
                    }
                  </span>

                  <span>
                    <b>Status</b>

                    <StatusBadge
                      status={
                        team.team_status
                      }
                    />
                  </span>
                </div>

                <Button
                  small
                  variant="secondary"
                  onClick={() =>
                    viewTeam(
                      team.team_id
                    )
                  }
                >
                  View team
                </Button>
              </Card>
            )
          )}
        </div>
      )}

      <CreateTeamModal
        open={createOpen}
        projects={projects}
        onClose={() =>
          setCreateOpen(
            false
          )
        }
        onSuccess={() => {
          setCreateOpen(
            false
          );
          load();
        }}
      />

      <TeamDetailsModal
        team={selectedTeam}
        user={user}
        onClose={() =>
          setSelectedTeam(
            null
          )
        }
        onChanged={load}
      />
    </>
  );
}

function CreateTeamModal({
  open,
  projects,
  onClose,
  onSuccess
}) {
  const [
    projectId,
    setProjectId
  ] = useState("");

  const [
    teamName,
    setTeamName
  ] = useState("");

  const [
    smart,
    setSmart
  ] = useState(false);

  const [
    loading,
    setLoading
  ] = useState(false);

  const submit =
    async (event) => {
      event.preventDefault();

      if (
        !projectId ||
        !teamName
      ) {
        return;
      }

      setLoading(true);

      try {
        if (smart) {
          await apiRequest(
            `/teams/smart-form/${projectId}`,
            {
              method: "POST",
              body: JSON.stringify({
                team_name:
                  teamName
              })
            }
          );
        } else {
          await apiRequest(
            "/teams",
            {
              method: "POST",
              body: JSON.stringify({
                project_id:
                  Number(
                    projectId
                  ),
                team_name:
                  teamName,
                formation_type:
                  "Manual",
                team_status:
                  "Active"
              })
            }
          );
        }

        setProjectId("");
        setTeamName("");
        setSmart(false);

        onSuccess();
      } catch (err) {
        window.alert(
          err?.message ||
            "Could not create team"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <Modal
      open={open}
      title="Create project team"
      onClose={onClose}
    >
      <form
        className="stack-form"
        onSubmit={submit}
      >
        <label className="field">
          <span>
            Project <em>*</em>
          </span>

          <select
            value={projectId}
            onChange={(event) =>
              setProjectId(
                event.target.value
              )
            }
            required
          >
            <option value="">
              Select project
            </option>

            {safeArray(
              projects
            ).map(
              (project) => (
                <option
                  key={
                    project.project_id
                  }
                  value={
                    project.project_id
                  }
                >
                  {
                    project.project_title
                  }
                </option>
              )
            )}
          </select>
        </label>

        <Field
          label="Team name"
          value={teamName}
          onChange={setTeamName}
          placeholder="e.g. Team Alpha"
          required
        />

        <label className="toggle-field">
          <input
            type="checkbox"
            checked={smart}
            onChange={(event) =>
              setSmart(
                event.target.checked
              )
            }
          />

          <span>
            Use smart team formation
          </span>
        </label>

        <p className="helper-text">
          Smart formation ranks
          eligible applicants by
          compatibility and
          places remaining
          applicants on the
          waitlist.
        </p>

        <div className="modal-actions">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : smart
                ? "Form smart team"
                : "Create team"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TeamDetailsModal({
  team,
  user,
  onClose,
  onChanged
}) {
  const [
    students,
    setStudents
  ] = useState([]);

  const [
    studentId,
    setStudentId
  ] = useState("");

  const [
    role,
    setRole
  ] = useState("Member");

  const [
    loading,
    setLoading
  ] = useState(false);

  useEffect(() => {
    if (
      !team ||
      user.role !== ROLE.FACULTY
    ) {
      return;
    }

    apiRequest(
      "/students"
    )
      .then((data) =>
        setStudents(
          safeArray(data)
        )
      )
      .catch(() =>
        setStudents([])
      );
  }, [
    team,
    user.role
  ]);

  if (!team) {
    return null;
  }

  const addMember =
    async (event) => {
      event.preventDefault();

      if (!studentId) {
        return;
      }

      setLoading(true);

      try {
        await apiRequest(
          `/teams/${team.team_id}/members`,
          {
            method: "POST",
            body: JSON.stringify({
              student_id:
                Number(studentId),
              member_role:
                role
            })
          }
        );

        setStudentId("");

        await onChanged?.();

        onClose();
      } catch (err) {
        window.alert(
          err?.message ||
            "Could not add member"
        );
      } finally {
        setLoading(false);
      }
    };

  const removeMember =
    async (student) => {
      if (
        user.role !==
        ROLE.FACULTY
      ) {
        return;
      }

      try {
        await apiRequest(
          `/teams/${team.team_id}/members/${student.student_id}`,
          {
            method: "DELETE"
          }
        );

        onClose();
        onChanged?.();
      } catch (err) {
        window.alert(
          err?.message ||
            "Could not remove member"
        );
      }
    };

  return (
    <Modal
      open={Boolean(team)}
      title={team.team_name}
      onClose={onClose}
      width="920px"
    >
      <div className="team-detail-header">
        <div>
          <span>
            {
              team.project_title
            }
          </span>

          <StatusBadge
            status={
              team.team_status
            }
          />
        </div>
      </div>

      <Card
        title="Team members"
        subtitle={`${safeArray(team.members).length} member(s)`}
      >
        {!safeArray(
          team.members
        ).length ? (
          <EmptyState
            title="No members"
            text="Students assigned to the team will appear here."
          />
        ) : (
          <div className="member-list">
            {safeArray(
              team.members
            ).map(
              (member) => (
                <div
                  className="member-row"
                  key={
                    member.team_member_id
                  }
                >
                  <div className="avatar">
                    {initials(
                      member.full_name
                    )}
                  </div>

                  <div>
                    <strong>
                      {
                        member.full_name
                      }
                    </strong>

                    <span>
                      {
                        member.register_number
                      }{" "}
                      ·{" "}
                      {
                        member.email
                      }
                    </span>
                  </div>

                  <span className="pill">
                    {
                      member.member_role
                    }
                  </span>

                  {user.role ===
                    ROLE.FACULTY && (
                    <Button
                      small
                      variant="ghost"
                      onClick={() =>
                        removeMember(
                          member
                        )
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </Card>

      {user.role ===
        ROLE.FACULTY && (
        <Card
          title="Add member"
          className="mt-16"
        >
          <form
            className="inline-form"
            onSubmit={addMember}
          >
            <label className="field">
              <span>
                Student <em>*</em>
              </span>

              <select
                value={studentId}
                onChange={(event) =>
                  setStudentId(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select student
                </option>

                {students.map(
                  (student) => (
                    <option
                      key={
                        student.student_id
                      }
                      value={
                        student.student_id
                      }
                    >
                      {
                        student.full_name
                      }{" "}
                      (
                      {
                        student.register_number
                      }
                      )
                    </option>
                  )
                )}
              </select>
            </label>

            <Field
              label="Role"
              value={role}
              onChange={setRole}
              options={[
                "Leader",
                "Member"
              ]}
            />

            <Button
              type="submit"
              disabled={loading}
            >
              Add member
            </Button>
          </form>
        </Card>
      )}
    </Modal>
  );
}

/* =========================================================
   MILESTONES
========================================================= */

function MilestonesPage({
  user
}) {
  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(
    "/milestones"
  );

  const {
    data: projects
  } = useFetchData(
    user.role === ROLE.FACULTY
      ? `/faculty/${user.faculty_id}/projects`
      : "/projects/status/approved"
  );

  const [
    projectId,
    setProjectId
  ] = useState("");

  const [
    title,
    setTitle
  ] = useState("");

  const [
    description,
    setDescription
  ] = useState("");

  const [
    dueDate,
    setDueDate
  ] = useState("");

  const [
    status,
    setStatus
  ] = useState("");

  const [
    completion,
    setCompletion
  ] = useState("");

  const [
    saving,
    setSaving
  ] = useState(false);

  const isFaculty =
    user.role ===
    ROLE.FACULTY;

  if (loading) {
    return (
      <PageLoader text="Loading milestones..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  let milestones =
    safeArray(data);

  if (
    user.role ===
    ROLE.STUDENT
  ) {
    const projectIds =
      new Set(
        safeArray(
          projects
        ).map(
          (project) =>
            Number(
              project.project_id
            )
        )
      );

    milestones =
      milestones.filter(
        (milestone) =>
          projectIds.has(
            Number(
              milestone.project_id
            )
          )
      );
  }

  if (
    isFaculty
  ) {
    const projectIds =
      new Set(
        safeArray(
          projects
        ).map(
          (project) =>
            Number(
              project.project_id
            )
        )
      );

    milestones =
      milestones.filter(
        (milestone) =>
          projectIds.has(
            Number(
              milestone.project_id
            )
          )
      );
  }

  const create =
    async (event) => {
      event.preventDefault();

      setSaving(true);

      try {
        await apiRequest(
          "/milestones",
          {
            method: "POST",
            body: JSON.stringify({
              project_id:
                Number(projectId),

              milestone_title:
                title,

              milestone_description:
                description,

              due_date:
                dueDate
            })
          }
        );

        setProjectId("");
        setTitle("");
        setDescription("");
        setDueDate("");

        reload();
      } catch (err) {
        window.alert(
          err?.message ||
            "Could not create milestone"
        );
      } finally {
        setSaving(false);
      }
    };

  const updateMilestone =
    async (milestone) => {
      try {
        await apiRequest(
          `/milestones/${milestone.milestone_id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              status,
              completion_percentage:
                completion ===
                ""
                  ? undefined
                  : Number(
                      completion
                    )
            })
          }
        );

        reload();
      } catch (err) {
        window.alert(
          err?.message ||
            "Could not update milestone"
        );
      }
    };

  return (
    <>
      <PageIntro
        eyebrow="MILESTONE MANAGEMENT"
        title="Project milestones"
        text="Define research milestones and track their completion."
      />

      {isFaculty && (
        <Card
          title="Create milestone"
          className="mb-24"
        >
          <form
            className="form-grid"
            onSubmit={create}
          >
            <label className="field">
              <span>
                Project <em>*</em>
              </span>

              <select
                value={projectId}
                onChange={(event) =>
                  setProjectId(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select project
                </option>

                {safeArray(
                  projects
                ).map(
                  (project) => (
                    <option
                      key={
                        project.project_id
                      }
                      value={
                        project.project_id
                      }
                    >
                      {
                        project.project_title
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <Field
              label="Milestone title"
              value={title}
              onChange={setTitle}
              placeholder="Literature Review"
              required
            />

            <Field
              label="Due date"
              value={dueDate}
              onChange={setDueDate}
              type="date"
              required
            />

            <Field
              label="Description"
              value={description}
              onChange={
                setDescription
              }
              textarea
            />

            <div className="form-actions">
              <Button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Creating..."
                  : "Create milestone"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!milestones.length ? (
        <EmptyState
          title="No milestones"
          text="No milestones are currently available for your projects."
        />
      ) : (
        <div className="timeline-list">
          {milestones.map(
            (item) => (
              <div
                className="timeline-item"
                key={
                  item.milestone_id
                }
              >
                <div className="timeline-dot" />

                <Card>
                  <div className="timeline-heading">
                    <div>
                      <span className="eyebrow-mini">
                        {
                          item.project_title
                        }
                      </span>

                      <h3>
                        {
                          item.milestone_title
                        }
                      </h3>
                    </div>

                    <StatusBadge
                      status={
                        item.status
                      }
                    />
                  </div>

                  <p>
                    {
                      item.milestone_description ||
                      "No description."
                    }
                  </p>

                  <div className="timeline-meta">
                    <span>
                      Due{" "}
                      {formatDate(
                        item.due_date
                      )}
                    </span>

                    <strong>
                      {
                        item.completion_percentage ??
                        0
                      }
                      %
                    </strong>
                  </div>

                  <div className="progress-track large">
                    <i
                      style={{
                        width: `${Math.min(
                          100,
                          Number(
                            item.completion_percentage ||
                              0
                          )
                        )}%`
                      }}
                    />
                  </div>
                </Card>
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}

/* =========================================================
   TASKS
========================================================= */

function TasksPage({
  user
}) {
  const endpoint =
    user.role ===
    ROLE.STUDENT
      ? `/students/${user.student_id}/tasks`
      : "/tasks";

  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(endpoint);

  const [
    createOpen,
    setCreateOpen
  ] = useState(false);

  const [
    milestones,
    setMilestones
  ] = useState([]);

  const [
    students,
    setStudents
  ] = useState([]);

  const [
    selectedTask,
    setSelectedTask
  ] = useState(null);

  const [
    editingTask,
    setEditingTask
  ] = useState(null);

  useEffect(() => {
    if (
      user.role !==
      ROLE.FACULTY
    ) {
      return;
    }

    Promise.all([
      apiRequest(
        "/milestones"
      ),
      apiRequest(
        "/students"
      )
    ])
      .then(
        ([
          milestoneData,
          studentData
        ]) => {
          setMilestones(
            safeArray(
              milestoneData
            )
          );

          setStudents(
            safeArray(
              studentData
            )
          );
        }
      )
      .catch(() => {
        setMilestones([]);
        setStudents([]);
      });
  }, [
    user.role
  ]);

  if (loading) {
    return (
      <PageLoader text="Loading tasks..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const tasks =
    safeArray(data);

  const facultyMilestones =
    milestones.filter(
      (milestone) =>
        user.role !==
          ROLE.FACULTY ||
        Number(
          milestone.project_id
        ) >= 0
    );

  return (
    <>
      <PageIntro
        eyebrow="TASK MANAGEMENT"
        title={
          user.role ===
          ROLE.STUDENT
            ? "Your assigned tasks"
            : "Project tasks"
        }
        text={
          user.role ===
          ROLE.STUDENT
            ? "Update work assigned to you."
            : "Create, assign and manage project tasks."
        }
        actions={
          user.role ===
          ROLE.FACULTY ? (
            <Button
              onClick={() =>
                setCreateOpen(
                  true
                )
              }
            >
              + New task
            </Button>
          ) : null
        }
      />

      {!tasks.length ? (
        <EmptyState
          title="No tasks"
          text="No tasks are currently available."
          action={
            user.role ===
            ROLE.FACULTY ? (
              <Button
                onClick={() =>
                  setCreateOpen(
                    true
                  )
                }
              >
                Create task
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="task-grid">
          {tasks.map(
            (task) => (
              <Card
                key={
                  task.task_id
                }
                className="task-card"
              >
                <div className="task-top">
                  <span className="eyebrow-mini">
                    {
                      task.project_title
                    }
                  </span>

                  <StatusBadge
                    status={
                      task.status
                    }
                  />
                </div>

                <h3>
                  {
                    task.task_title
                  }
                </h3>

                <p>
                  {
                    task.task_description ||
                    "No task description."
                  }
                </p>

                <div className="task-meta">
                  <span>
                    Priority{" "}
                    <b>
                      {
                        task.priority ||
                        "—"
                      }
                    </b>
                  </span>

                  <span>
                    Due{" "}
                    <b>
                      {formatDate(
                        task.due_date
                      )}
                    </b>
                  </span>
                </div>

                <div className="task-progress">
                  <div className="task-progress-header">
                    <span>
                      Completion
                    </span>

                    <strong>
                      {
                        task.completion_percentage ??
                        0
                      }
                      %
                    </strong>
                  </div>

                  <div className="progress-track large">
                    <i
                      style={{
                        width: `${Math.min(
                          100,
                          Number(
                            task.completion_percentage ||
                              0
                          )
                        )}%`
                      }}
                    />
                  </div>
                </div>

                <div className="task-card-actions">
                  {user.role ===
                    ROLE.STUDENT && (
                    <Button
                      small
                      onClick={() =>
                        setSelectedTask(
                          task
                        )
                      }
                    >
                      Update progress
                    </Button>
                  )}

                  {user.role ===
                    ROLE.FACULTY && (
                    <Button
                      small
                      variant="secondary"
                      onClick={() =>
                        setEditingTask(
                          task
                        )
                      }
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </Card>
            )
          )}
        </div>
      )}

      <TaskCreateModal
        open={createOpen}
        milestones={
          facultyMilestones
        }
        students={students}
        onClose={() =>
          setCreateOpen(
            false
          )
        }
        onSuccess={() => {
          setCreateOpen(
            false
          );
          reload();
        }}
      />

      <TaskEditModal
        task={editingTask}
        students={students}
        onClose={() =>
          setEditingTask(
            null
          )
        }
        onSuccess={() => {
          setEditingTask(
            null
          );
          reload();
        }}
      />

      <ProgressModal
        task={selectedTask}
        studentId={
          user.student_id
        }
        onClose={() =>
          setSelectedTask(
            null
          )
        }
        onSuccess={() => {
          setSelectedTask(
            null
          );
          reload();
        }}
      />
    </>
  );
}

function TaskCreateModal({
  open,
  milestones,
  students,
  onClose,
  onSuccess
}) {
  const [
    form,
    setForm
  ] = useState({
    milestone_id: "",
    team_id: "",
    task_title: "",
    task_description: "",
    assigned_to: "",
    priority: "Medium",
    due_date: ""
  });

  const [
    loading,
    setLoading
  ] = useState(false);

  const update =
    (key, value) =>
      setForm(
        (prev) => ({
          ...prev,
          [key]: value
        })
      );

  const submit =
    async (event) => {
      event.preventDefault();

      setLoading(true);

      try {
        await apiRequest(
          "/tasks",
          {
            method: "POST",
            body: JSON.stringify({
              milestone_id:
                Number(
                  form.milestone_id
                ),

              team_id:
                form.team_id
                  ? Number(
                      form.team_id
                    )
                  : null,

              task_title:
                form.task_title,

              task_description:
                form.task_description,

              assigned_to:
                form.assigned_to
                  ? Number(
                      form.assigned_to
                    )
                  : null,

              priority:
                form.priority,

              due_date:
                form.due_date ||
                null
            })
          }
        );

        onSuccess();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to create task"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <Modal
      open={open}
      title="Create task"
      onClose={onClose}
    >
      <form
        className="form-grid"
        onSubmit={submit}
      >
        <label className="field">
          <span>
            Milestone <em>*</em>
          </span>

          <select
            value={
              form.milestone_id
            }
            onChange={(event) =>
              update(
                "milestone_id",
                event.target.value
              )
            }
            required
          >
            <option value="">
              Select milestone
            </option>

            {safeArray(
              milestones
            ).map(
              (milestone) => (
                <option
                  key={
                    milestone.milestone_id
                  }
                  value={
                    milestone.milestone_id
                  }
                >
                  {
                    milestone.milestone_title
                  }{" "}
                  —{" "}
                  {
                    milestone.project_title
                  }
                </option>
              )
            )}
          </select>
        </label>

        <Field
          label="Team ID"
          value={form.team_id}
          onChange={(value) =>
            update(
              "team_id",
              value
            )
          }
          type="number"
          placeholder="Optional"
        />

        <Field
          label="Task title"
          value={
            form.task_title
          }
          onChange={(value) =>
            update(
              "task_title",
              value
            )
          }
          required
        />

        <label className="field">
          <span>
            Assign student
          </span>

          <select
            value={
              form.assigned_to
            }
            onChange={(event) =>
              update(
                "assigned_to",
                event.target.value
              )
            }
          >
            <option value="">
              Unassigned
            </option>

            {safeArray(
              students
            ).map(
              (student) => (
                <option
                  key={
                    student.student_id
                  }
                  value={
                    student.student_id
                  }
                >
                  {
                    student.full_name
                  }{" "}
                  (
                  {
                    student.register_number
                  }
                  )
                </option>
              )
            )}
          </select>
        </label>

        <Field
          label="Priority"
          value={
            form.priority
          }
          onChange={(value) =>
            update(
              "priority",
              value
            )
          }
          options={[
            "Low",
            "Medium",
            "High"
          ]}
        />

        <Field
          label="Due date"
          value={
            form.due_date
          }
          onChange={(value) =>
            update(
              "due_date",
              value
            )
          }
          type="date"
        />

        <Field
          label="Description"
          value={
            form.task_description
          }
          onChange={(value) =>
            update(
              "task_description",
              value
            )
          }
          textarea
        />

        <div className="modal-actions">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TaskEditModal({
  task,
  students,
  onClose,
  onSuccess
}) {
  const [
    form,
    setForm
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(false);

  useEffect(() => {
    if (!task) {
      setForm(null);
      return;
    }

    setForm({
      task_title:
        task.task_title || "",

      task_description:
        task.task_description ||
        "",

      assigned_to:
        task.assigned_to ||
        "",

      priority:
        task.priority ||
        "Medium",

      due_date:
        task.due_date
          ? String(
              task.due_date
            ).slice(0, 10)
          : "",

      status:
        task.status || "",

      completion_percentage:
        task.completion_percentage ??
        0
    });
  }, [task]);

  if (!task || !form) {
    return null;
  }

  const update =
    (key, value) =>
      setForm(
        (prev) => ({
          ...prev,
          [key]: value
        })
      );

  const save =
    async (event) => {
      event.preventDefault();

      setLoading(true);

      try {
        await apiRequest(
          `/tasks/${task.task_id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              task_title:
                form.task_title,

              task_description:
                form.task_description,

              assigned_to:
                form.assigned_to
                  ? Number(
                      form.assigned_to
                    )
                  : null,

              priority:
                form.priority,

              due_date:
                form.due_date ||
                null,

              status:
                form.status,

              completion_percentage:
                Number(
                  form.completion_percentage
                )
            })
          }
        );

        onSuccess();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to update task"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <Modal
      open={Boolean(task)}
      title={`Edit task: ${task.task_title}`}
      onClose={onClose}
    >
      <form
        className="form-grid"
        onSubmit={save}
      >
        <Field
          label="Task title"
          value={
            form.task_title
          }
          onChange={(value) =>
            update(
              "task_title",
              value
            )
          }
          required
        />

        <label className="field">
          <span>
            Assigned student
          </span>

          <select
            value={
              form.assigned_to
            }
            onChange={(event) =>
              update(
                "assigned_to",
                event.target.value
              )
            }
          >
            <option value="">
              Unassigned
            </option>

            {safeArray(
              students
            ).map(
              (student) => (
                <option
                  key={
                    student.student_id
                  }
                  value={
                    student.student_id
                  }
                >
                  {
                    student.full_name
                  }
                </option>
              )
            )}
          </select>
        </label>

        <Field
          label="Priority"
          value={
            form.priority
          }
          onChange={(value) =>
            update(
              "priority",
              value
            )
          }
          options={[
            "Low",
            "Medium",
            "High"
          ]}
        />

        <Field
          label="Status"
          value={form.status}
          onChange={(value) =>
            update(
              "status",
              value
            )
          }
          options={[
            "Not Started",
            "In Progress",
            "Completed",
            "Blocked"
          ]}
        />

        <Field
          label="Completion %"
          value={
            form.completion_percentage
          }
          onChange={(value) =>
            update(
              "completion_percentage",
              value
            )
          }
          type="number"
          min="0"
          max="100"
        />

        <Field
          label="Due date"
          value={
            form.due_date
          }
          onChange={(value) =>
            update(
              "due_date",
              value
            )
          }
          type="date"
        />

        <Field
          label="Description"
          value={
            form.task_description
          }
          onChange={(value) =>
            update(
              "task_description",
              value
            )
          }
          textarea
        />

        <div className="modal-actions">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : "Save task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* =========================================================
   PROGRESS
========================================================= */

function ProgressModal({
  task,
  studentId,
  onClose,
  onSuccess
}) {
  const [
    percentage,
    setPercentage
  ] = useState("0");

  const [
    description,
    setDescription
  ] = useState("");

  const [
    saving,
    setSaving
  ] = useState(false);

  useEffect(() => {
    if (!task) return;

    setPercentage(
      String(
        task.completion_percentage ??
          0
      )
    );

    setDescription("");
  }, [task]);

  if (!task) {
    return null;
  }

  const save =
    async (event) => {
      event.preventDefault();

      setSaving(true);

      try {
        await apiRequest(
          "/progress-updates",
          {
            method: "POST",
            body: JSON.stringify({
              task_id:
                task.task_id,

              student_id:
                studentId,

              progress_percentage:
                Number(
                  percentage
                ),

              update_description:
                description
            })
          }
        );

        onSuccess();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to update progress"
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <Modal
      open={Boolean(task)}
      title={`Update: ${task.task_title}`}
      onClose={onClose}
    >
      <form
        className="stack-form"
        onSubmit={save}
      >
        <Field
          label="Progress percentage"
          value={percentage}
          onChange={setPercentage}
          type="number"
          min="0"
          max="100"
          required
        />

        <Field
          label="Progress update"
          value={description}
          onChange={setDescription}
          textarea
          placeholder="Describe what you completed."
        />

        <div className="modal-actions">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Submitting..."
              : "Submit update"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProgressPage({
  user
}) {
  const {
    data: projects
  } = useFetchData(
    user.role === ROLE.FACULTY
      ? `/faculty/${user.faculty_id}/projects`
      : `/students/${user.student_id}/teams`
  );

  const [
    projectId,
    setProjectId
  ] = useState("");

  const [
    rows,
    setRows
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const search =
    async (event) => {
      event.preventDefault();

      if (!projectId) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result =
          await apiRequest(
            `/progress/project/${projectId}`
          );

        setRows(
          safeArray(result)
        );
      } catch (err) {
        setError(
          err?.message ||
            "Failed to load progress"
        );
      } finally {
        setLoading(false);
      }
    };

  const projectOptions =
    user.role === ROLE.FACULTY
      ? safeArray(projects)
      : [];

  return (
    <>
      <PageIntro
        eyebrow="PROGRESS TRACKING"
        title="Project progress"
        text="Review task-level completion and student progress updates."
      />

      <Card
        title="Select project"
        className="mb-24"
      >
        <form
          className="inline-form"
          onSubmit={search}
        >
          {user.role ===
          ROLE.FACULTY ? (
            <label className="field">
              <span>
                Project <em>*</em>
              </span>

              <select
                value={projectId}
                onChange={(event) =>
                  setProjectId(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select project
                </option>

                {projectOptions.map(
                  (project) => (
                    <option
                      key={
                        project.project_id
                      }
                      value={
                        project.project_id
                      }
                    >
                      {
                        project.project_title
                      }
                    </option>
                  )
                )}
              </select>
            </label>
          ) : (
            <Field
              label="Project ID"
              value={projectId}
              onChange={setProjectId}
              type="number"
              required
            />
          )}

          <Button type="submit">
            Load progress
          </Button>
        </form>
      </Card>

      {error && (
        <ErrorBanner
          message={error}
          onClose={() =>
            setError("")
          }
        />
      )}

      {loading ? (
        <PageLoader text="Loading project progress..." />
      ) : !rows.length ? (
        <EmptyState
          title="No progress data"
          text="Select a project to see its current progress."
        />
      ) : (
        <Card>
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>
                    Milestone
                  </th>

                  <th>
                    Task
                  </th>

                  <th>
                    Team
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Progress
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row) => (
                    <tr
                      key={
                        row.task_id
                      }
                    >
                      <td>
                        {
                          row.milestone_title
                        }
                      </td>

                      <td>
                        <strong>
                          {
                            row.task_title
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          row.team_name ||
                          "—"
                        }
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            row.status
                          }
                        />
                      </td>

                      <td>
                        <div className="table-progress">
                          <div>
                            <i
                              style={{
                                width: `${Math.min(
                                  100,
                                  Number(
                                    row.latest_progress ||
                                      0
                                  )
                                )}%`
                              }}
                            />
                          </div>

                          <span>
                            {
                              row.latest_progress ??
                              0
                            }
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

/* =========================================================
   RESOURCES
========================================================= */

function ResourcesPage({
  user
}) {
  const {
    data: resources,
    loading,
    error,
    reload
  } = useFetchData(
    "/resources"
  );

  const {
    data: requests,
    reload:
      reloadRequests
  } =
    useFetchData(
      "/resource-requests"
    );

  const {
    data: projectData
  } =
    useFetchData(
      user.role === ROLE.FACULTY
        ? `/faculty/${user.faculty_id}/projects`
        : user.role === ROLE.STUDENT
          ? `/students/${user.student_id}/teams`
          : "/projects"
    );

  const [
    createOpen,
    setCreateOpen
  ] = useState(false);

  const [
    requestOpen,
    setRequestOpen
  ] = useState(false);

  const [
    allocateRequest,
    setAllocateRequest
  ] = useState(null);

  if (loading) {
    return (
      <PageLoader text="Loading resources..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const projects =
    safeArray(projectData);

  const visibleRequests =
    user.role === ROLE.FACULTY
      ? safeArray(
          requests
        )
      : user.role === ROLE.ADMIN
        ? safeArray(
            requests
          )
        : safeArray(
            requests
          ).filter(
            (request) =>
              projects.some(
                (item) =>
                  Number(
                    item.project_id
                  ) ===
                  Number(
                    request.project_id
                  )
              )
          );

  return (
    <>
      <PageIntro
        eyebrow="RESOURCE MANAGEMENT"
        title="Research resources"
        text="Track inventory, submit requests and allocate resources to projects."
        actions={
          <div className="page-intro-actions">
            {user.role ===
              ROLE.ADMIN && (
              <Button
                onClick={() =>
                  setCreateOpen(
                    true
                  )
                }
              >
                + Add resource
              </Button>
            )}

            {user.role ===
              ROLE.STUDENT && (
              <Button
                onClick={() =>
                  setRequestOpen(
                    true
                  )
                }
              >
                + Request resource
              </Button>
            )}
          </div>
        }
      />

      <Card
        title="Resource inventory"
        subtitle="Current availability"
      >
        {!safeArray(
          resources
        ).length ? (
          <EmptyState
            title="No resources"
            text="Resources will appear after they are created."
          />
        ) : (
          <div className="resource-list">
            {safeArray(
              resources
            ).map(
              (resource) => (
                <div
                  className="resource-row"
                  key={
                    resource.resource_id
                  }
                >
                  <div className="resource-icon">
                    ▣
                  </div>

                  <div>
                    <strong>
                      {
                        resource.resource_name
                      }
                    </strong>

                    <span>
                      {
                        resource.resource_type
                      }
                    </span>
                  </div>

                  <div className="resource-quantity">
                    <strong>
                      {
                        resource.available_quantity
                      }
                    </strong>

                    <span>
                      /{" "}
                      {
                        resource.total_quantity
                      }{" "}
                      available
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Card>

      <Card
        title="Resource requests"
        subtitle="Latest requests and allocations"
        className="mt-24"
      >
        {!visibleRequests.length ? (
          <EmptyState
            title="No requests"
            text="No resource requests are available."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>
                    Resource
                  </th>

                  <th>
                    Project
                  </th>

                  <th>
                    Quantity
                  </th>

                  <th>
                    Status
                  </th>

                  {(user.role ===
                    ROLE.ADMIN ||
                    user.role ===
                      ROLE.FACULTY) && (
                    <th>
                      Action
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {visibleRequests.map(
                  (request) => (
                    <tr
                      key={
                        request.request_id
                      }
                    >
                      <td>
                        {
                          request.resource_name
                        }
                      </td>

                      <td>
                        {
                          request.project_title ||
                          request.project_id
                        }
                      </td>

                      <td>
                        {
                          request.requested_quantity
                        }
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            request.status
                          }
                        />
                      </td>

                      {(user.role ===
                        ROLE.ADMIN ||
                        user.role ===
                          ROLE.FACULTY) && (
                        <td>
                          {request.status ===
                            "Pending" && (
                            <Button
                              small
                              onClick={() =>
                                setAllocateRequest(
                                  request
                                )
                              }
                            >
                              Allocate
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ResourceCreateModal
        open={createOpen}
        onClose={() =>
          setCreateOpen(false)
        }
        onSuccess={() => {
          setCreateOpen(false);
          reload();
        }}
      />

      <ResourceRequestModal
        open={requestOpen}
        projects={projects}
        resources={resources}
        teams={projects}
        studentId={
          user.student_id
        }
        onClose={() =>
          setRequestOpen(false)
        }
        onSuccess={() => {
          setRequestOpen(false);
          reloadRequests?.();
        }}
      />

      <ResourceAllocationModal
        request={
          allocateRequest
        }
        user={user}
        onClose={() =>
          setAllocateRequest(
            null
          )
        }
        onSuccess={() => {
          setAllocateRequest(
            null
          );
          reload();
          reloadRequests?.();
        }}
      />
    </>
  );
}

function ResourceCreateModal({
  open,
  onClose,
  onSuccess
}) {
  const [
    form,
    setForm
  ] = useState({
    resource_name: "",
    resource_type: "",
    total_quantity: "",
    description: ""
  });

  const [
    saving,
    setSaving
  ] = useState(false);

  const update =
    (key, value) =>
      setForm(
        (prev) => ({
          ...prev,
          [key]: value
        })
      );

  const submit =
    async (event) => {
      event.preventDefault();

      setSaving(true);

      try {
        await apiRequest(
          "/resources",
          {
            method: "POST",
            body: JSON.stringify({
              ...form,
              total_quantity:
                Number(
                  form.total_quantity
                )
            })
          }
        );

        onSuccess();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to create resource"
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <Modal
      open={open}
      title="Add resource"
      onClose={onClose}
    >
      <form
        className="stack-form"
        onSubmit={submit}
      >
        <Field
          label="Resource name"
          value={
            form.resource_name
          }
          onChange={(value) =>
            update(
              "resource_name",
              value
            )
          }
          required
        />

        <Field
          label="Resource type"
          value={
            form.resource_type
          }
          onChange={(value) =>
            update(
              "resource_type",
              value
            )
          }
          required
        />

        <Field
          label="Total quantity"
          value={
            form.total_quantity
          }
          onChange={(value) =>
            update(
              "total_quantity",
              value
            )
          }
          type="number"
          min="0"
          required
        />

        <Field
          label="Description"
          value={
            form.description
          }
          onChange={(value) =>
            update(
              "description",
              value
            )
          }
          textarea
        />

        <div className="modal-actions">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Add resource"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ResourceRequestModal({
  open,
  projects,
  resources,
  teams,
  studentId,
  onClose,
  onSuccess
}) {
  const [
    form,
    setForm
  ] = useState({
    project_id: "",
    team_id: "",
    resource_id: "",
    requested_quantity:
      "1",
    required_from: "",
    required_until: "",
    purpose: ""
  });

  const [
    saving,
    setSaving
  ] = useState(false);

  const update =
    (key, value) =>
      setForm(
        (prev) => ({
          ...prev,
          [key]: value
        })
      );

  const submit =
    async (event) => {
      event.preventDefault();

      setSaving(true);

      try {
        await apiRequest(
          "/resource-requests",
          {
            method: "POST",
            body: JSON.stringify({
              project_id:
                Number(
                  form.project_id
                ),

              team_id:
                Number(
                  form.team_id
                ),

              resource_id:
                Number(
                  form.resource_id
                ),

              requested_quantity:
                Number(
                  form.requested_quantity
                ),

              required_from:
                form.required_from ||
                null,

              required_until:
                form.required_until ||
                null,

              purpose:
                form.purpose,

              requested_by:
                studentId
            })
          }
        );

        onSuccess();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to submit request"
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <Modal
      open={open}
      title="Request a resource"
      onClose={onClose}
    >
      <form
        className="stack-form"
        onSubmit={submit}
      >
        <label className="field">
          <span>
            Project <em>*</em>
          </span>

          <select
            value={
              form.project_id
            }
            onChange={(event) =>
              update(
                "project_id",
                event.target.value
              )
            }
            required
          >
            <option value="">
              Select project
            </option>

            {safeArray(
              projects
            ).map(
              (project) => (
                <option
                  key={
                    project.project_id
                  }
                  value={
                    project.project_id
                  }
                >
                  {
                    project.project_title
                  }
                </option>
              )
            )}
          </select>
        </label>

        <Field
          label="Team ID"
          value={
            form.team_id
          }
          onChange={(value) =>
            update(
              "team_id",
              value
            )
          }
          type="number"
          required
        />

        <label className="field">
          <span>
            Resource <em>*</em>
          </span>

          <select
            value={
              form.resource_id
            }
            onChange={(event) =>
              update(
                "resource_id",
                event.target.value
              )
            }
            required
          >
            <option value="">
              Select resource
            </option>

            {safeArray(
              resources
            ).map(
              (resource) => (
                <option
                  key={
                    resource.resource_id
                  }
                  value={
                    resource.resource_id
                  }
                >
                  {
                    resource.resource_name
                  }{" "}
                  —{" "}
                  {
                    resource.available_quantity
                  }{" "}
                  available
                </option>
              )
            )}
          </select>
        </label>

        <Field
          label="Quantity"
          value={
            form.requested_quantity
          }
          onChange={(value) =>
            update(
              "requested_quantity",
              value
            )
          }
          type="number"
          min="1"
          required
        />

        <Field
          label="Required from"
          value={
            form.required_from
          }
          onChange={(value) =>
            update(
              "required_from",
              value
            )
          }
          type="date"
        />

        <Field
          label="Required until"
          value={
            form.required_until
          }
          onChange={(value) =>
            update(
              "required_until",
              value
            )
          }
          type="date"
        />

        <Field
          label="Purpose"
          value={
            form.purpose
          }
          onChange={(value) =>
            update(
              "purpose",
              value
            )
          }
          textarea
          required
        />

        <div className="modal-actions">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Submitting..."
              : "Submit request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ResourceAllocationModal({
  request,
  user,
  onClose,
  onSuccess
}) {
  const [
    quantity,
    setQuantity
  ] = useState(
    String(
      request?.requested_quantity ||
        1
    )
  );

  const [
    from,
    setFrom
  ] = useState("");

  const [
    until,
    setUntil
  ] = useState("");

  const [
    remarks,
    setRemarks
  ] = useState("");

  const [
    saving,
    setSaving
  ] = useState(false);

  useEffect(() => {
    if (!request) return;

    setQuantity(
      String(
        request.requested_quantity ||
          1
      )
    );
  }, [request]);

  if (!request) {
    return null;
  }

  const save =
    async (event) => {
      event.preventDefault();

      setSaving(true);

      try {
        await apiRequest(
          "/resource-allocations",
          {
            method: "POST",
            body: JSON.stringify({
              request_id:
                request.request_id,

              allocated_quantity:
                Number(quantity),

              allocated_by:
                user.user_id,

              allocated_from:
                from || null,

              allocated_until:
                until || null,

              remarks
            })
          }
        );

        onSuccess();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to allocate resource"
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <Modal
      open={Boolean(request)}
      title="Allocate resource"
      onClose={onClose}
    >
      <form
        className="stack-form"
        onSubmit={save}
      >
        <div className="allocation-summary">
          <strong>
            {
              request.resource_name
            }
          </strong>

          <span>
            Requested:{" "}
            {
              request.requested_quantity
            }
          </span>

          <span>
            Available:{" "}
            {
              request.available_quantity
            }
          </span>
        </div>

        <Field
          label="Allocated quantity"
          value={quantity}
          onChange={setQuantity}
          type="number"
          min="1"
          required
        />

        <Field
          label="Allocation start"
          value={from}
          onChange={setFrom}
          type="date"
        />

        <Field
          label="Allocation end"
          value={until}
          onChange={setUntil}
          type="date"
        />

        <Field
          label="Remarks"
          value={remarks}
          onChange={setRemarks}
          textarea
        />

        <div className="modal-actions">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Allocating..."
              : "Allocate"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* =========================================================
   ISSUES
========================================================= */

function IssuesPage({
  user
}) {
  const [
    projectId,
    setProjectId
  ] = useState("");

  const [
    issues,
    setIssues
  ] = useState([]);

  const [
    projects,
    setProjects
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    form,
    setForm
  ] = useState({
    issue_title: "",
    issue_description: "",
    issue_category:
      "Technical",
    severity: "Medium"
  });

  const loadProjects =
    useCallback(
      async () => {
        try {
          let result = [];

          if (
            user.role ===
            ROLE.FACULTY
          ) {
            result =
              await apiRequest(
                `/faculty/${user.faculty_id}/projects`
              );
          } else if (
            user.role ===
            ROLE.STUDENT
          ) {
            const teams =
              await apiRequest(
                `/students/${user.student_id}/teams`
              );

            const unique =
              [
                ...new Map(
                  safeArray(
                    teams
                  ).map(
                    (team) => [
                      team.project_id,
                      {
                        project_id:
                          team.project_id,
                        project_title:
                          team.project_title
                      }
                    ]
                  )
                ).values()
              ];

            result = unique;
          } else {
            result =
              await apiRequest(
                "/projects"
              );
          }

          setProjects(
            safeArray(result)
          );
        } catch {
          setProjects([]);
        }
      },
      [
        user.role,
        user.faculty_id,
        user.student_id
      ]
    );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const load =
    async (event) => {
      event?.preventDefault();

      if (!projectId) {
        return;
      }

      setLoading(true);

      try {
        const result =
          await apiRequest(
            `/issues/project/${projectId}`
          );

        setIssues(
          safeArray(result)
        );
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to load issues"
        );
      } finally {
        setLoading(false);
      }
    };

  const create =
    async (event) => {
      event.preventDefault();

      try {
        await apiRequest(
          "/issues",
          {
            method: "POST",
            body: JSON.stringify({
              project_id:
                Number(projectId),

              reported_by:
                user.user_id,

              ...form
            })
          }
        );

        setForm({
          issue_title: "",
          issue_description:
            "",
          issue_category:
            "Technical",
          severity:
            "Medium"
        });

        load();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to report issue"
        );
      }
    };

  const updateStatus =
    async (
      id,
      status
    ) => {
      try {
        await apiRequest(
          `/issues/${id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              status
            })
          }
        );

        load();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to update issue"
        );
      }
    };

  return (
    <>
      <PageIntro
        eyebrow="ISSUE MANAGEMENT"
        title="Project issues"
        text="Report and resolve issues affecting research work."
      />

      <Card className="mb-24">
        <form
          className="inline-form"
          onSubmit={load}
        >
          <label className="field">
            <span>
              Project <em>*</em>
            </span>

            <select
              value={projectId}
              onChange={(event) =>
                setProjectId(
                  event.target.value
                )
              }
              required
            >
              <option value="">
                Select project
              </option>

              {projects.map(
                (project) => (
                  <option
                    key={
                      project.project_id
                    }
                    value={
                      project.project_id
                    }
                  >
                    {
                      project.project_title
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <Button type="submit">
            Load issues
          </Button>
        </form>
      </Card>

      {projectId && (
        <div className="two-column-layout">
          <Card
            title="Report an issue"
            subtitle="Add a new project issue"
          >
            <form
              className="stack-form"
              onSubmit={create}
            >
              <Field
                label="Issue title"
                value={
                  form.issue_title
                }
                onChange={(value) =>
                  setForm(
                    (prev) => ({
                      ...prev,
                      issue_title:
                        value
                    })
                  )
                }
                required
              />

              <Field
                label="Category"
                value={
                  form.issue_category
                }
                onChange={(value) =>
                  setForm(
                    (prev) => ({
                      ...prev,
                      issue_category:
                        value
                    })
                  )
                }
                options={[
                  "Technical",
                  "Resource",
                  "Schedule",
                  "Team",
                  "Other"
                ]}
              />

              <Field
                label="Severity"
                value={
                  form.severity
                }
                onChange={(value) =>
                  setForm(
                    (prev) => ({
                      ...prev,
                      severity:
                        value
                    })
                  )
                }
                options={[
                  "Low",
                  "Medium",
                  "High",
                  "Critical"
                ]}
              />

              <Field
                label="Description"
                value={
                  form.issue_description
                }
                onChange={(value) =>
                  setForm(
                    (prev) => ({
                      ...prev,
                      issue_description:
                        value
                    })
                  )
                }
                textarea
                required
              />

              <Button type="submit">
                Report issue
              </Button>
            </form>
          </Card>

          <Card
            title="Issue history"
            subtitle="Current status"
          >
            {loading ? (
              <InlineLoader />
            ) : !issues.length ? (
              <EmptyState
                title="No issues"
                text="This project currently has no recorded issues."
              />
            ) : (
              <div className="list">
                {issues.map(
                  (issue) => (
                    <div
                      className="list-row issue-row"
                      key={
                        issue.issue_id
                      }
                    >
                      <div>
                        <strong>
                          {
                            issue.issue_title
                          }
                        </strong>

                        <span>
                          {
                            issue.issue_category
                          }{" "}
                          ·{" "}
                          {
                            issue.severity
                          }
                        </span>
                      </div>

                      <div className="issue-actions">
                        <StatusBadge
                          status={
                            issue.status
                          }
                        />

                        {![
                          "Resolved",
                          "Closed"
                        ].includes(
                          issue.status
                        ) && (
                          <Button
                            small
                            variant="secondary"
                            onClick={() =>
                              updateStatus(
                                issue.issue_id,
                                "Resolved"
                              )
                            }
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

/* =========================================================
   RISKS
========================================================= */

function RisksPage({
  user
}) {
  const [
    projectId,
    setProjectId
  ] = useState("");

  const [
    risks,
    setRisks
  ] = useState([]);

  const [
    projects,
    setProjects
  ] = useState([]);

  const [
    form,
    setForm
  ] = useState({
    risk_title: "",
    risk_description: "",
    probability:
      "Medium",
    impact: "Medium",
    mitigation_plan:
      ""
  });

  const loadProjects =
    useCallback(
      async () => {
        try {
          let result = [];

          if (
            user.role ===
            ROLE.FACULTY
          ) {
            result =
              await apiRequest(
                `/faculty/${user.faculty_id}/projects`
              );
          } else if (
            user.role ===
            ROLE.STUDENT
          ) {
            const teams =
              await apiRequest(
                `/students/${user.student_id}/teams`
              );

            result = [
              ...new Map(
                safeArray(
                  teams
                ).map(
                  (team) => [
                    team.project_id,
                    {
                      project_id:
                        team.project_id,
                      project_title:
                        team.project_title
                    }
                  ]
                )
              ).values()
            ];
          } else {
            result =
              await apiRequest(
                "/projects"
              );
          }

          setProjects(
            safeArray(result)
          );
        } catch {
          setProjects([]);
        }
      },
      [
        user.role,
        user.faculty_id,
        user.student_id
      ]
    );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const load =
    async (event) => {
      event?.preventDefault();

      if (!projectId)
        return;

      try {
        const data =
          await apiRequest(
            `/risks/project/${projectId}`
          );

        setRisks(
          safeArray(data)
        );
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to load risks"
        );
      }
    };

  const create =
    async (event) => {
      event.preventDefault();

      try {
        await apiRequest(
          "/risks",
          {
            method: "POST",
            body: JSON.stringify({
              project_id:
                Number(projectId),

              ...form
            })
          }
        );

        setForm({
          risk_title: "",
          risk_description:
            "",
          probability:
            "Medium",
          impact: "Medium",
          mitigation_plan:
            ""
        });

        load();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to create risk"
        );
      }
    };

  const updateStatus =
    async (
      id,
      status
    ) => {
      try {
        await apiRequest(
          `/risks/${id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              status
            })
          }
        );

        load();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to update risk"
        );
      }
    };

  return (
    <>
      <PageIntro
        eyebrow="RISK MANAGEMENT"
        title="Project risk register"
        text="Record probability, impact and mitigation plans for project risks."
      />

      <Card className="mb-24">
        <form
          className="inline-form"
          onSubmit={load}
        >
          <label className="field">
            <span>
              Project <em>*</em>
            </span>

            <select
              value={projectId}
              onChange={(event) =>
                setProjectId(
                  event.target.value
                )
              }
              required
            >
              <option value="">
                Select project
              </option>

              {projects.map(
                (project) => (
                  <option
                    key={
                      project.project_id
                    }
                    value={
                      project.project_id
                    }
                  >
                    {
                      project.project_title
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <Button type="submit">
            Load risks
          </Button>
        </form>
      </Card>

      {projectId && (
        <div className="two-column-layout">
          <Card
            title="Add risk"
            subtitle="Record a project risk"
          >
            <form
              className="stack-form"
              onSubmit={create}
            >
              <Field
                label="Risk title"
                value={
                  form.risk_title
                }
                onChange={(value) =>
                  setForm(
                    (prev) => ({
                      ...prev,
                      risk_title:
                        value
                    })
                  )
                }
                required
              />

              <Field
                label="Probability"
                value={
                  form.probability
                }
                onChange={(value) =>
                  setForm(
                    (prev) => ({
                      ...prev,
                      probability:
                        value
                    })
                  )
                }
                options={[
                  "Low",
                  "Medium",
                  "High"
                ]}
              />

              <Field
                label="Impact"
                value={
                  form.impact
                }
                onChange={(value) =>
                  setForm(
                    (prev) => ({
                      ...prev,
                      impact: value
                    })
                  )
                }
                options={[
                  "Low",
                  "Medium",
                  "High"
                ]}
              />

              <Field
                label="Description"
                value={
                  form.risk_description
                }
                onChange={(value) =>
                  setForm(
                    (prev) => ({
                      ...prev,
                      risk_description:
                        value
                    })
                  )
                }
                textarea
              />

              <Field
                label="Mitigation plan"
                value={
                  form.mitigation_plan
                }
                onChange={(value) =>
                  setForm(
                    (prev) => ({
                      ...prev,
                      mitigation_plan:
                        value
                    })
                  )
                }
                textarea
              />

              <Button type="submit">
                Add risk
              </Button>
            </form>
          </Card>

          <Card
            title="Risk register"
            subtitle="Current project risks"
          >
            {!risks.length ? (
              <EmptyState
                title="No risks"
                text="No risks have been recorded."
              />
            ) : (
              <div className="risk-list">
                {risks.map(
                  (risk) => (
                    <div
                      className="risk-card"
                      key={
                        risk.risk_id
                      }
                    >
                      <div className="risk-heading">
                        <div>
                          <strong>
                            {
                              risk.risk_title
                            }
                          </strong>

                          <span>
                            {
                              risk.risk_description ||
                              "No description."
                            }
                          </span>
                        </div>

                        <StatusBadge
                          status={
                            risk.status
                          }
                        />
                      </div>

                      <div className="risk-grid">
                        <div>
                          <span>
                            Probability
                          </span>

                          <strong>
                            {
                              risk.probability
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Impact
                          </span>

                          <strong>
                            {
                              risk.impact
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Mitigation
                          </span>

                          <strong>
                            {
                              risk.mitigation_plan ||
                              "—"
                            }
                          </strong>
                        </div>
                      </div>

                      {![
                        "Resolved",
                        "Closed"
                      ].includes(
                        risk.status
                      ) && (
                        <Button
                          small
                          variant="secondary"
                          onClick={() =>
                            updateStatus(
                              risk.risk_id,
                              "Resolved"
                            )
                          }
                        >
                          Mark resolved
                        </Button>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

/* =========================================================
   EVALUATIONS
========================================================= */

function EvaluationsPage({
  user
}) {
  const endpoint =
    user.role ===
    ROLE.STUDENT
      ? `/evaluations/student/${user.student_id}`
      : user.role ===
          ROLE.FACULTY
        ? `/evaluations/faculty/${user.faculty_id}`
        : "/evaluations";

  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(endpoint);

  const [
    form,
    setForm
  ] = useState({
    student_id: "",
    project_id: "",
    faculty_id:
      user.faculty_id ||
      "",
    technical_skills_score:
      "8",
    contribution_score:
      "8",
    teamwork_score: "8",
    communication_score:
      "8",
    feedback: ""
  });

  const [
    saving,
    setSaving
  ] = useState(false);

  if (loading) {
    return (
      <PageLoader text="Loading evaluations..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const evaluations =
    safeArray(data);

  const update =
    (key, value) =>
      setForm(
        (prev) => ({
          ...prev,
          [key]: value
        })
      );

  const submit =
    async (event) => {
      event.preventDefault();

      setSaving(true);

      try {
        await apiRequest(
          "/evaluations",
          {
            method: "POST",
            body: JSON.stringify({
              student_id:
                Number(
                  form.student_id
                ),

              project_id:
                Number(
                  form.project_id
                ),

              faculty_id:
                Number(
                  form.faculty_id
                ),

              technical_skills_score:
                Number(
                  form.technical_skills_score
                ),

              contribution_score:
                Number(
                  form.contribution_score
                ),

              teamwork_score:
                Number(
                  form.teamwork_score
                ),

              communication_score:
                Number(
                  form.communication_score
                ),

              feedback:
                form.feedback
            })
          }
        );

        setForm((prev) => ({
          ...prev,
          student_id: "",
          project_id: "",
          feedback: ""
        }));

        reload();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to submit evaluation"
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <>
      <PageIntro
        eyebrow="STUDENT EVALUATIONS"
        title={
          user.role ===
          ROLE.STUDENT
            ? "Faculty feedback"
            : "Student evaluations"
        }
        text={
          user.role ===
          ROLE.STUDENT
            ? "Review your project evaluation and written feedback."
            : "Record structured evaluation scores for project students."
        }
      />

      {user.role ===
        ROLE.FACULTY && (
        <Card
          title="Evaluate a student"
          subtitle="Scores are recorded out of 10"
          className="mb-24"
        >
          <form
            className="evaluation-form"
            onSubmit={submit}
          >
            <Field
              label="Student ID"
              value={
                form.student_id
              }
              onChange={(value) =>
                update(
                  "student_id",
                  value
                )
              }
              type="number"
              required
            />

            <Field
              label="Project ID"
              value={
                form.project_id
              }
              onChange={(value) =>
                update(
                  "project_id",
                  value
                )
              }
              type="number"
              required
            />

            <Field
              label="Technical skills"
              value={
                form.technical_skills_score
              }
              onChange={(value) =>
                update(
                  "technical_skills_score",
                  value
                )
              }
              type="number"
              min="0"
              max="10"
              step="0.5"
            />

            <Field
              label="Contribution"
              value={
                form.contribution_score
              }
              onChange={(value) =>
                update(
                  "contribution_score",
                  value
                )
              }
              type="number"
              min="0"
              max="10"
              step="0.5"
            />

            <Field
              label="Teamwork"
              value={
                form.teamwork_score
              }
              onChange={(value) =>
                update(
                  "teamwork_score",
                  value
                )
              }
              type="number"
              min="0"
              max="10"
              step="0.5"
            />

            <Field
              label="Communication"
              value={
                form.communication_score
              }
              onChange={(value) =>
                update(
                  "communication_score",
                  value
                )
              }
              type="number"
              min="0"
              max="10"
              step="0.5"
            />

            <Field
              label="Feedback"
              value={
                form.feedback
              }
              onChange={(value) =>
                update(
                  "feedback",
                  value
                )
              }
              textarea
            />

            <Button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Submitting..."
                : "Submit evaluation"}
            </Button>
          </form>
        </Card>
      )}

      {!evaluations.length ? (
        <EmptyState
          title="No evaluations"
          text="No evaluation records are available yet."
        />
      ) : (
        <div className="evaluation-grid">
          {evaluations.map(
            (item) => (
              <Card
                className="evaluation-card"
                key={
                  item.evaluation_id
                }
              >
                <div className="evaluation-top">
                  <div>
                    <span className="eyebrow-mini">
                      {
                        item.project_title
                      }
                    </span>

                    <h3>
                      {
                        item.student_name ||
                        "Student"
                      }
                    </h3>
                  </div>

                  <div className="evaluation-score">
                    {
                      item.overall_score
                    }

                    <small>
                      /10
                    </small>
                  </div>
                </div>

                <div className="evaluation-bars">
                  <EvaluationBar
                    label="Technical skills"
                    value={
                      item.technical_skills_score
                    }
                  />

                  <EvaluationBar
                    label="Contribution"
                    value={
                      item.contribution_score
                    }
                  />

                  <EvaluationBar
                    label="Teamwork"
                    value={
                      item.teamwork_score
                    }
                  />

                  <EvaluationBar
                    label="Communication"
                    value={
                      item.communication_score
                    }
                  />
                </div>

                <div className="feedback-box">
                  <strong>
                    Feedback
                  </strong>

                  <p>
                    {
                      item.feedback ||
                      "No written feedback."
                    }
                  </p>
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </>
  );
}

function EvaluationBar({
  label,
  value
}) {
  const score =
    Number(value || 0);

  return (
    <div className="evaluation-bar">
      <div>
        <span>{label}</span>

        <strong>
          {score.toFixed(1)}
        </strong>
      </div>

      <div className="progress-track">
        <i
          style={{
            width: `${Math.min(
              100,
              score * 10
            )}%`
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function NotificationsPage({
  user,
  reloadCount
}) {
  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(
    `/notifications/${user.user_id}`
  );

  const markRead =
    async (id) => {
      try {
        await apiRequest(
          `/notifications/${id}/read`,
          {
            method: "PUT"
          }
        );

        reload();
        reloadCount?.();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to mark notification read"
        );
      }
    };

  const markAll =
    async () => {
      try {
        await apiRequest(
          `/notifications/user/${user.user_id}/read-all`,
          {
            method: "PUT"
          }
        );

        reload();
        reloadCount?.();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to mark notifications as read"
        );
      }
    };

  if (loading) {
    return (
      <PageLoader text="Loading notifications..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const notifications =
    safeArray(data);

  const unread =
    notifications.filter(
      (item) =>
        !item.is_read
    );

  return (
    <>
      <PageIntro
        eyebrow="SYSTEM NOTIFICATIONS"
        title="Your notifications"
        text="Stay updated about applications, project decisions, teams and evaluations."
        actions={
          unread.length ? (
            <Button
              variant="secondary"
              onClick={markAll}
            >
              Mark all read
            </Button>
          ) : null
        }
      />

      {!notifications.length ? (
        <EmptyState
          title="No notifications"
          text="You don't have any notifications yet."
        />
      ) : (
        <div className="notification-list">
          {notifications.map(
            (item) => (
              <div
                className={
                  item.is_read
                    ? "notification-card read"
                    : "notification-card"
                }
                key={
                  item.notification_id
                }
              >
                <div className="notification-icon">
                  {item.is_read
                    ? "○"
                    : "●"}
                </div>

                <div className="notification-content">
                  <div className="notification-title-row">
                    <h3>
                      {
                        item.title
                      }
                    </h3>

                    <small>
                      {formatDateTime(
                        item.created_at
                      )}
                    </small>
                  </div>

                  <p>
                    {
                      item.message
                    }
                  </p>
                </div>

                {!item.is_read && (
                  <Button
                    small
                    variant="ghost"
                    onClick={() =>
                      markRead(
                        item.notification_id
                      )
                    }
                  >
                    Mark read
                  </Button>
                )}
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}

/* =========================================================
   PROFILE — IMPORTANT STUDENT CHANGE
========================================================= */

function ProfilePage({
  user,
  onProfileSaved
}) {
  const isStudent =
    user.role ===
    ROLE.STUDENT;

  const path = isStudent
    ? `/student-profiles/${user.student_id}`
    : `/faculty-profiles/${user.faculty_id}`;

  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(path);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    form,
    setForm
  ] = useState({
    full_name:
      user.full_name || "",

    email:
      user.email || "",

    registration_number:
      user.register_number ||
      "",

    semester:
      user.semester ?? "",

    cgpa:
      user.cgpa ?? "",

    previous_project_experience:
      user.previous_project_experience ||
      "No",

    skills: "",
    interests: "",
    bio: "",

    employee_id:
      user.employee_id || "",

    designation:
      user.designation || "",

    specialization:
      user.specialization ||
      ""
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    setForm((previous) => ({
      ...previous,

      ...data,

      registration_number:
        data.registration_number ??
        previous.registration_number,

      semester:
        data.semester ??
        previous.semester,

      cgpa:
        data.cgpa ??
        previous.cgpa
    }));
  }, [data]);

  if (loading) {
    return (
      <PageLoader text="Loading your profile..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const updateField = (
    key,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const profileComplete =
    isStudent
      ? Boolean(
          form.registration_number &&
            form.registration_number !==
              "AUTO" &&
            form.semester !==
              "" &&
            form.cgpa !== "" &&
            Number(form.cgpa) > 0
        )
      : true;

  const saveProfile =
    async (event) => {
      event.preventDefault();

      if (isStudent) {
        if (
          !form.registration_number ||
          form.registration_number ===
            "AUTO" ||
          form.semester ===
            "" ||
          form.cgpa === ""
        ) {
          window.alert(
            "Please enter your registration number, semester and CGPA."
          );

          return;
        }

        const cgpa =
          Number(form.cgpa);

        const semester =
          Number(form.semester);

        if (
          !Number.isFinite(
            cgpa
          ) ||
          cgpa < 0 ||
          cgpa > 10
        ) {
          window.alert(
            "CGPA must be between 0 and 10."
          );

          return;
        }

        if (
          !Number.isFinite(
            semester
          ) ||
          semester < 1
        ) {
          window.alert(
            "Please enter a valid semester."
          );

          return;
        }
      }

      setSaving(true);

      try {
        if (isStudent) {
          await apiRequest(
            `/student-profiles/${user.student_id}`,
            {
              method: "PUT",
              body: JSON.stringify({
                registration_number:
                  form.registration_number,

                semester:
                  Number(
                    form.semester
                  ),

                cgpa:
                  Number(
                    form.cgpa
                  ),

                skills:
                  form.skills || "",

                interests:
                  form.interests || "",

                bio:
                  form.bio || ""
              })
            }
          );

          await apiRequest(
            `/students/${user.student_id}`,
            {
              method: "PUT",

              body: JSON.stringify({
                register_number:
                  form.registration_number,

                semester:
                  Number(
                    form.semester
                  ),

                cgpa:
                  Number(
                    form.cgpa
                  ),

                previous_project_experience:
                  form.previous_project_experience
              })
            }
          );

          const updatedUser =
            {
              ...user,

              register_number:
                form.registration_number,

              semester:
                Number(
                  form.semester
                ),

              cgpa:
                Number(
                  form.cgpa
                ),

              previous_project_experience:
                form.previous_project_experience
            };

          localStorage.setItem(
            "researchhub_user",
            JSON.stringify(
              updatedUser
            )
          );

          onProfileSaved?.(
            updatedUser
          );
        } else {
          await apiRequest(
            `/faculty-profiles/${user.faculty_id}`,
            {
              method: "PUT",
              body: JSON.stringify({
                employee_id:
                  form.employee_id,

                designation:
                  form.designation,

                specialization:
                  form.specialization
              })
            }
          );
        }

        await reload();

        window.alert(
          "Profile saved successfully."
        );
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to save profile."
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <>
      <PageIntro
        eyebrow={
          isStudent
            ? "STUDENT PROFILE"
            : "FACULTY PROFILE"
        }
        title={
          isStudent &&
          !profileComplete
            ? "Complete your profile"
            : "Your profile"
        }
        text={
          isStudent
            ? "Enter your actual academic details. ResearchHub uses them for project eligibility, compatibility and recommendations."
            : "Keep your faculty information up to date."
        }
      />

      {isStudent &&
        !profileComplete && (
          <div className="profile-alert">
            <div className="profile-alert-icon">
              !
            </div>

            <div className="profile-alert-content">
              <strong>
                Your academic profile
                is incomplete
              </strong>

              <p>
                Enter your actual
                registration number,
                semester, CGPA and
                project experience.
                These values will
                be used when you
                apply for projects.
              </p>
            </div>
          </div>
        )}

      <div className="profile-layout">
        <Card className="profile-card">
          <div className="profile-hero">
            <div className="avatar avatar-large">
              {initials(
                user.full_name
              )}
            </div>

            <div>
              <h2>
                {user.full_name}
              </h2>

              <p>
                {user.email}
              </p>

              <StatusBadge
                status={
                  user.role
                }
              />
            </div>
          </div>

          <div className="profile-summary">
            <DetailItem
              label="User ID"
              value={
                user.user_id
              }
            />

            <DetailItem
              label="Role"
              value={
                user.role
              }
            />

            <DetailItem
              label="Department"
              value={
                user.department_id ||
                "Not set"
              }
            />

            {isStudent ? (
              <>
                <DetailItem
                  label="Student ID"
                  value={
                    user.student_id
                  }
                />

                <DetailItem
                  label="Registration number"
                  value={
                    form.registration_number ||
                    "Not set"
                  }
                />

                <DetailItem
                  label="Semester"
                  value={
                    form.semester ===
                    ""
                      ? "Not set"
                      : form.semester
                  }
                />

                <DetailItem
                  label="CGPA"
                  value={
                    form.cgpa ===
                    ""
                      ? "Not set"
                      : form.cgpa
                  }
                />
              </>
            ) : (
              <>
                <DetailItem
                  label="Faculty ID"
                  value={
                    user.faculty_id
                  }
                />

                <DetailItem
                  label="Employee ID"
                  value={
                    form.employee_id ||
                    "Not set"
                  }
                />
              </>
            )}
          </div>
        </Card>

        <Card
          title={
            isStudent
              ? "Academic details"
              : "Faculty details"
          }
          subtitle={
            isStudent
              ? "Use your real academic information."
              : "Update your professional information."
          }
        >
          <form
            className="stack-form"
            onSubmit={
              saveProfile
            }
          >
            {isStudent ? (
              <>
                <Field
                  label="Registration number"
                  value={
                    form.registration_number
                  }
                  onChange={(value) =>
                    updateField(
                      "registration_number",
                      value
                    )
                  }
                  placeholder="e.g. 24BLC1101"
                  required
                />

                <Field
                  label="Semester"
                  value={
                    form.semester
                  }
                  onChange={(value) =>
                    updateField(
                      "semester",
                      value
                    )
                  }
                  type="number"
                  min="1"
                  max="20"
                  required
                />

                <Field
                  label="CGPA"
                  value={
                    form.cgpa
                  }
                  onChange={(value) =>
                    updateField(
                      "cgpa",
                      value
                    )
                  }
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  placeholder="e.g. 8.2"
                  required
                />

                <Field
                  label="Previous project experience"
                  value={
                    form.previous_project_experience
                  }
                  onChange={(value) =>
                    updateField(
                      "previous_project_experience",
                      value
                    )
                  }
                  options={[
                    "No",
                    "Yes"
                  ]}
                  required
                />

                <Field
                  label="Skills"
                  value={
                    form.skills
                  }
                  onChange={(value) =>
                    updateField(
                      "skills",
                      value
                    )
                  }
                  textarea
                  placeholder="Python, SQL, React, Machine Learning..."
                />

                <Field
                  label="Research interests"
                  value={
                    form.interests
                  }
                  onChange={(value) =>
                    updateField(
                      "interests",
                      value
                    )
                  }
                  textarea
                  placeholder="Artificial Intelligence, VLSI, Cloud Computing..."
                />

                <Field
                  label="Bio"
                  value={
                    form.bio
                  }
                  onChange={(value) =>
                    updateField(
                      "bio",
                      value
                    )
                  }
                  textarea
                  placeholder="Tell faculty members about yourself..."
                />
              </>
            ) : (
              <>
                <Field
                  label="Employee ID"
                  value={
                    form.employee_id
                  }
                  onChange={(value) =>
                    updateField(
                      "employee_id",
                      value
                    )
                  }
                />

                <Field
                  label="Designation"
                  value={
                    form.designation
                  }
                  onChange={(value) =>
                    updateField(
                      "designation",
                      value
                    )
                  }
                />

                <Field
                  label="Specialization"
                  value={
                    form.specialization
                  }
                  onChange={(value) =>
                    updateField(
                      "specialization",
                      value
                    )
                  }
                  textarea
                />
              </>
            )}

            <Button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save profile"}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}

/* =========================================================
   ADMIN DATA
========================================================= */

function AdminDataPage({
  type
}) {
  const config = {
    users: {
      endpoint:
        "/users",
      title: "User management",
      eyebrow:
        "USER ADMINISTRATION"
    },

    students: {
      endpoint:
        "/students",
      title: "Student records",
      eyebrow:
        "STUDENT ADMINISTRATION"
    },

    faculty: {
      endpoint:
        "/faculty",
      title: "Faculty records",
      eyebrow:
        "FACULTY ADMINISTRATION"
    },

    departments: {
      endpoint:
        "/departments",
      title: "Departments",
      eyebrow:
        "DEPARTMENT ADMINISTRATION"
    }
  }[type];

  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(
    config.endpoint
  );

  if (loading) {
    return (
      <PageLoader
        text={`Loading ${config.title.toLowerCase()}...`}
      />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const rows =
    safeArray(data);

  return (
    <>
      <PageIntro
        eyebrow={
          config.eyebrow
        }
        title={config.title}
        text="View database records used by ResearchHub."
      />

      <Card className="table-card">
        {!rows.length ? (
          <EmptyState
            title="No records"
            text="There are no records to display."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  {type ===
                    "users" && (
                    <>
                      <th>
                        ID
                      </th>
                      <th>
                        Name
                      </th>
                      <th>
                        Email
                      </th>
                      <th>
                        Role
                      </th>
                      <th>
                        Department
                      </th>
                    </>
                  )}

                  {type ===
                    "students" && (
                    <>
                      <th>
                        ID
                      </th>
                      <th>
                        Student
                      </th>
                      <th>
                        Registration
                      </th>
                      <th>
                        CGPA
                      </th>
                      <th>
                        Semester
                      </th>
                    </>
                  )}

                  {type ===
                    "faculty" && (
                    <>
                      <th>
                        ID
                      </th>
                      <th>
                        Faculty
                      </th>
                      <th>
                        Employee ID
                      </th>
                      <th>
                        Designation
                      </th>
                      <th>
                        Specialization
                      </th>
                    </>
                  )}

                  {type ===
                    "departments" && (
                    <>
                      <th>
                        ID
                      </th>
                      <th>
                        Department
                      </th>
                      <th>
                        Code
                      </th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row) => (
                    <tr
                      key={
                        row.user_id ||
                        row.student_id ||
                        row.faculty_id ||
                        row.department_id
                      }
                    >
                      {type ===
                        "users" && (
                        <>
                          <td>
                            {
                              row.user_id
                            }
                          </td>

                          <td>
                            <strong>
                              {
                                row.full_name
                              }
                            </strong>
                          </td>

                          <td>
                            {
                              row.email
                            }
                          </td>

                          <td>
                            <StatusBadge
                              status={
                                row.role
                              }
                            />
                          </td>

                          <td>
                            {
                              row.department_id ||
                              "—"
                            }
                          </td>
                        </>
                      )}

                      {type ===
                        "students" && (
                        <>
                          <td>
                            {
                              row.student_id
                            }
                          </td>

                          <td>
                            <strong>
                              {
                                row.full_name
                              }
                            </strong>

                            <small>
                              {
                                row.email
                              }
                            </small>
                          </td>

                          <td>
                            {
                              row.register_number
                            }
                          </td>

                          <td>
                            {
                              row.cgpa
                            }
                          </td>

                          <td>
                            {
                              row.semester
                            }
                          </td>
                        </>
                      )}

                      {type ===
                        "faculty" && (
                        <>
                          <td>
                            {
                              row.faculty_id
                            }
                          </td>

                          <td>
                            <strong>
                              {
                                row.full_name
                              }
                            </strong>

                            <small>
                              {
                                row.email
                              }
                            </small>
                          </td>

                          <td>
                            {
                              row.employee_id
                            }
                          </td>

                          <td>
                            {
                              row.designation ||
                              "—"
                            }
                          </td>

                          <td>
                            {
                              row.specialization ||
                              "—"
                            }
                          </td>
                        </>
                      )}

                      {type ===
                        "departments" && (
                        <>
                          <td>
                            {
                              row.department_id
                            }
                          </td>

                          <td>
                            <strong>
                              {
                                row.department_name
                              }
                            </strong>
                          </td>

                          <td>
                            {
                              row.department_code
                            }
                          </td>
                        </>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* =========================================================
   APPROVALS
========================================================= */

function ApprovalsPage({
  user
}) {
  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(
    "/projects"
  );

  const [
    updating,
    setUpdating
  ] = useState(null);

  if (loading) {
    return (
      <PageLoader text="Loading project approvals..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  const pending =
    safeArray(data).filter(
      (project) =>
        project.status ===
        "Pending Approval"
    );

  const decide =
    async (
      projectId,
      decision
    ) => {
      setUpdating(projectId);

      try {
        await apiRequest(
          `/projects/${projectId}/approval`,
          {
            method: "PUT",

            body: JSON.stringify({
              decision,

              reviewed_by:
                user.user_id,

              review_comments:
                `Admin decision: ${decision}`
            })
          }
        );

        reload();
      } catch (err) {
        window.alert(
          err?.message ||
            "Failed to process approval"
        );
      } finally {
        setUpdating(null);
      }
    };

  return (
    <>
      <PageIntro
        eyebrow="PROJECT APPROVAL WORKFLOW"
        title="Pending project proposals"
        text="Review proposals before projects become available to students."
      />

      {!pending.length ? (
        <EmptyState
          title="Nothing waiting for approval"
          text="All current project proposals have been reviewed."
        />
      ) : (
        <div className="approval-list">
          {pending.map(
            (project) => (
              <Card
                key={
                  project.project_id
                }
                className="approval-card"
              >
                <div className="approval-header">
                  <div>
                    <span className="eyebrow-mini">
                      PROJECT #
                      {
                        project.project_id
                      }
                    </span>

                    <h3>
                      {
                        project.project_title
                      }
                    </h3>
                  </div>

                  <StatusBadge
                    status={
                      project.status
                    }
                  />
                </div>

                <p>
                  {
                    project.project_description ||
                    "No description."
                  }
                </p>

                <div className="approval-meta">
                  <DetailItem
                    label="Faculty"
                    value={
                      project.faculty_name ||
                      project.faculty_id
                    }
                  />

                  <DetailItem
                    label="Department"
                    value={
                      project.department_name ||
                      project.department_id
                    }
                  />

                  <DetailItem
                    label="Minimum CGPA"
                    value={
                      project.minimum_cgpa ??
                      0
                    }
                  />

                  <DetailItem
                    label="Max team"
                    value={
                      project.maximum_team_size
                    }
                  />
                </div>

                <div className="approval-actions">
                  <Button
                    disabled={
                      updating ===
                      project.project_id
                    }
                    onClick={() =>
                      decide(
                        project.project_id,
                        "Approved"
                      )
                    }
                  >
                    Approve
                  </Button>

                  <Button
                    variant="danger"
                    disabled={
                      updating ===
                      project.project_id
                    }
                    onClick={() =>
                      decide(
                        project.project_id,
                        "Rejected"
                      )
                    }
                  >
                    Reject
                  </Button>

                  <Button
                    variant="secondary"
                    disabled={
                      updating ===
                      project.project_id
                    }
                    onClick={() =>
                      decide(
                        project.project_id,
                        "Revision Required"
                      )
                    }
                  >
                    Request revision
                  </Button>
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </>
  );
}

/* =========================================================
   REPORTS
========================================================= */

function ReportsPage() {
  const {
    data,
    loading,
    error,
    reload
  } = useFetchData(
    "/reports/summary"
  );

  if (loading) {
    return (
      <PageLoader text="Generating reports..." />
    );
  }

  if (error) {
    return (
      <PageError
        message={error}
        onRetry={reload}
      />
    );
  }

  return (
    <>
      <PageIntro
        eyebrow="REPORTS & ANALYTICS"
        title="ResearchHub analytics"
        text="Project, application, task, issue, risk and evaluation summaries."
      />

      <div className="report-grid">
        <ChartCard
          title="Projects by status"
          rows={
            data?.projects_by_status
          }
        />

        <ChartCard
          title="Applications by status"
          rows={
            data?.applications_by_status
          }
        />

        <ChartCard
          title="Projects by department"
          rows={(
            data?.projects_by_department ||
            []
          ).map((item) => ({
            label:
              item.department_name,
            count:
              item.project_count
          }))}
        />

        <ChartCard
          title="Tasks by status"
          rows={
            data?.tasks_by_status
          }
        />

        <ChartCard
          title="Issues by severity"
          rows={
            data?.issues_by_severity
          }
        />

        <ChartCard
          title="Risks by impact"
          rows={
            data?.risks_by_impact
          }
        />
      </div>

      <div className="stats-grid mt-24">
        <StatCard
          label="Completed projects"
          value={
            data?.completed_projects ??
            0
          }
          caption="Projects marked completed"
          icon="✓"
        />

        <StatCard
          label="Average evaluation"
          value={`${data?.average_student_evaluation ?? 0}/10`}
          caption="Across all evaluations"
          icon="★"
        />
      </div>
    </>
  );
}

function ChartCard({
  title,
  rows
}) {
  const values =
    safeArray(rows);

  const max =
    Math.max(
      1,
      ...values.map(
        (row) =>
          Number(
            row.count ??
              row.project_count ??
              0
          )
      )
    );

  return (
    <Card
      title={title}
      className="chart-card"
    >
      {!values.length ? (
        <p className="muted-text">
          No data available.
        </p>
      ) : (
        <div className="chart-list">
          {values.map(
            (row, index) => {
              const value =
                Number(
                  row.count ??
                    row.project_count ??
                    0
                );

              const label =
                row.status ||
                row.severity ||
                row.impact ||
                row.label ||
                "Unknown";

              return (
                <div
                  className="chart-row"
                  key={`${label}-${index}`}
                >
                  <div className="chart-row-label">
                    <span>
                      {label}
                    </span>

                    <strong>
                      {value}
                    </strong>
                  </div>

                  <div className="progress-track">
                    <i
                      style={{
                        width: `${(value / max) * 100}%`
                      }}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </Card>
  );
}

/* =========================================================
   ROUTER
========================================================= */

function AppPage({
  user,
  page,
  goTo,
  reloadNotifications
}) {
  if (
    page === "dashboard"
  ) {
    if (
      user.role ===
      ROLE.STUDENT
    ) {
      return (
        <StudentDashboard
          user={user}
          goTo={goTo}
        />
      );
    }

    if (
      user.role ===
      ROLE.FACULTY
    ) {
      return (
        <FacultyDashboard
          user={user}
          goTo={goTo}
        />
      );
    }

    return (
      <AdminDashboard
        goTo={goTo}
      />
    );
  }

  if (
    page === "projects"
  ) {
    return (
      <ProjectsPage
        user={user}
        goTo={goTo}
      />
    );
  }

  if (
    page ===
    "recommendations"
  ) {
    return (
      <RecommendationsPage
        user={user}
      />
    );
  }

  if (
    page ===
    "applications"
  ) {
    return (
      <ApplicationsPage
        user={user}
      />
    );
  }

  if (
    page ===
    "preferences"
  ) {
    return (
      <PreferencesPage
        user={user}
      />
    );
  }

  if (
    page === "skills"
  ) {
    return (
      <SkillsPage
        user={user}
      />
    );
  }

  if (
    page === "teams"
  ) {
    return (
      <TeamsPage
        user={user}
      />
    );
  }

  if (
    page === "milestones"
  ) {
    return (
      <MilestonesPage
        user={user}
      />
    );
  }

  if (
    page === "tasks"
  ) {
    return (
      <TasksPage
        user={user}
      />
    );
  }

  if (
    page === "progress"
  ) {
    return (
      <ProgressPage
        user={user}
      />
    );
  }

  if (
    page === "resources"
  ) {
    return (
      <ResourcesPage
        user={user}
      />
    );
  }

  if (
    page === "issues"
  ) {
    return (
      <IssuesPage
        user={user}
      />
    );
  }

  if (
    page === "risks"
  ) {
    return (
      <RisksPage
        user={user}
      />
    );
  }

  if (
    page === "evaluations"
  ) {
    return (
      <EvaluationsPage
        user={user}
      />
    );
  }

  if (
    page === "notifications"
  ) {
    return (
      <NotificationsPage
        user={user}
        reloadCount={
          reloadNotifications
        }
      />
    );
  }

  if (
    page === "profile"
  ) {
    return (
      <ProfilePage
        user={user}
        onProfileSaved={
          (
            updatedUser
          ) => {
            window.dispatchEvent(
              new CustomEvent(
                "researchhub-user-updated",
                {
                  detail:
                    updatedUser
                }
              )
            );
          }
        }
      />
    );
  }

  if (
    page === "users" &&
    user.role === ROLE.ADMIN
  ) {
    return (
      <AdminDataPage
        type="users"
      />
    );
  }

  if (
    page === "students" &&
    user.role === ROLE.ADMIN
  ) {
    return (
      <AdminDataPage
        type="students"
      />
    );
  }

  if (
    page === "faculty" &&
    user.role === ROLE.ADMIN
  ) {
    return (
      <AdminDataPage
        type="faculty"
      />
    );
  }

  if (
    page === "departments" &&
    user.role === ROLE.ADMIN
  ) {
    return (
      <AdminDataPage
        type="departments"
      />
    );
  }

  if (
    page === "approvals" &&
    user.role === ROLE.ADMIN
  ) {
    return (
      <ApprovalsPage
        user={user}
      />
    );
  }

  if (
    page === "reports" &&
    user.role === ROLE.ADMIN
  ) {
    return (
      <ReportsPage />
    );
  }

  return (
    <PageError
      message="The selected page could not be found."
      onRetry={() =>
        goTo("dashboard")
      }
    />
  );
}

/* =========================================================
   APP ROOT
========================================================= */

export default function App() {
  const [
    user,
    setUser
  ] = useState(() => {
    try {
      const stored =
        localStorage.getItem(
          "researchhub_user"
        );

      return stored
        ? JSON.parse(stored)
        : null;
    } catch {
      return null;
    }
  });

  const [
    activePage,
    setActivePage
  ] = useState(
    "dashboard"
  );

  const [
    notificationCount,
    setNotificationCount
  ] = useState(0);

  const loadNotificationCount =
    useCallback(
      async () => {
        if (!user?.user_id) {
          return;
        }

        try {
          const data =
            await apiRequest(
              `/notifications/${user.user_id}`
            );

          setNotificationCount(
            safeArray(data).filter(
              (item) =>
                !item.is_read
            ).length
          );
        } catch {
          setNotificationCount(
            0
          );
        }
      },
      [user?.user_id]
    );

  useEffect(() => {
    if (!user) {
      return;
    }

    try {
      localStorage.setItem(
        "researchhub_user",
        JSON.stringify(user)
      );
    } catch {
      // Ignore localStorage errors.
    }

    loadNotificationCount();
  }, [
    user,
    loadNotificationCount
  ]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const interval =
      setInterval(
        loadNotificationCount,
        30000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [
    user,
    loadNotificationCount
  ]);

  useEffect(() => {
    const handleUserUpdate =
      (event) => {
        if (
          event?.detail
        ) {
          setUser(
            event.detail
          );

          try {
            localStorage.setItem(
              "researchhub_user",
              JSON.stringify(
                event.detail
              )
            );
          } catch {
            // Ignore storage errors.
          }
        }
      };

    window.addEventListener(
      "researchhub-user-updated",
      handleUserUpdate
    );

    return () =>
      window.removeEventListener(
        "researchhub-user-updated",
        handleUserUpdate
      );
  }, []);

  const login =
    (nextUser) => {
      setUser(
        nextUser
      );

      setActivePage(
        "dashboard"
      );

      try {
        localStorage.setItem(
          "researchhub_user",
          JSON.stringify(
            nextUser
          )
        );
      } catch {
        // Ignore.
      }
    };

  const logout =
    () => {
      setUser(null);
      setNotificationCount(
        0
      );

      try {
        localStorage.removeItem(
          "researchhub_user"
        );
      } catch {
        // Ignore.
      }
    };

  if (!user) {
    return (
      <LoginScreen
        onLogin={login}
      />
    );
  }

  return (
    <AppShell
      user={user}
      activePage={
        activePage
      }
      setActivePage={
        setActivePage
      }
      onLogout={logout}
      notificationCount={
        notificationCount
      }
    >
      <AppPage
        user={user}
        page={activePage}
        goTo={setActivePage}
        reloadNotifications={
          loadNotificationCount
        }
      />
    </AppShell>
  );
}