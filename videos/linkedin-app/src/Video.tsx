import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const stats = [
  { value: "1,769", label: "companies discovered" },
  { value: "59,718", label: "jobs indexed" },
  { value: "57,170", label: "open jobs tracked" },
  { value: "561", label: "accepted candidates" },
];

const flow = [
  "Discover the company graph",
  "Store the exact ATS endpoint",
  "Sync public job feeds",
  "Deduplicate every role",
  "Run deterministic filters first",
  "Escalate only strong matches to AI",
  "Create tailored application docs",
];

const SCENE_FRAMES = 170;
const STEP_FRAMES = 146;
const TRANSITION_FRAMES = 24;
const TRANSITION_HALF = TRANSITION_FRAMES / 2;

export function LinkedInAppVideo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={styles.root}>
      <GridBackground />
      <SoftGlow top={-120} left={-100} color="rgba(124, 92, 255, 0.38)" />
      <SoftGlow top={760} left={620} color="rgba(43, 212, 135, 0.22)" />

      <Sequence durationInFrames={SCENE_FRAMES}>
        <TransitionShell immediateIn>
          <Intro />
        </TransitionShell>
      </Sequence>

      <Sequence from={STEP_FRAMES} durationInFrames={SCENE_FRAMES}>
        <TransitionShell>
          <ScreenshotScene
            image="mock-companies"
            kicker="Company Graph"
            title="Start with companies, not random job posts"
            body="The system discovers hiring teams, stores the exact ATS endpoint, then reuses that source every time jobs are synced."
            chips={["Company-first", "ATS endpoints", "Reusable sources"]}
          />
        </TransitionShell>
      </Sequence>

      <Sequence from={STEP_FRAMES * 2} durationInFrames={SCENE_FRAMES}>
        <TransitionShell>
          <ScreenshotScene
            image="mock-jobs"
            kicker="Signal Index"
            title="Turn a huge job market into a searchable database"
            body="Jobs are synced, deduplicated, indexed, and paginated so the dashboard stays useful even with tens of thousands of roles."
            chips={["59,718 jobs", "Pagination", "Indexed filters"]}
          />
        </TransitionShell>
      </Sequence>

      <Sequence from={STEP_FRAMES * 3} durationInFrames={SCENE_FRAMES}>
        <TransitionShell>
          <FilterScene />
        </TransitionShell>
      </Sequence>

      <Sequence from={STEP_FRAMES * 4} durationInFrames={SCENE_FRAMES}>
        <TransitionShell>
          <ScreenshotScene
            image="mock-applications"
            kicker="Document Studio"
            title="When a role is worth it, create the right materials"
            body="Accepted matches can turn into tailored CVs, cover letters, recommendations, and a clean application record."
            chips={["CV", "Cover letter", "Recommendation", "Tracker"]}
          />
        </TransitionShell>
      </Sequence>

      <Sequence from={STEP_FRAMES * 5} durationInFrames={SCENE_FRAMES}>
        <TransitionShell fadeOut={false}>
          <Outro />
        </TransitionShell>
      </Sequence>

      <div style={styles.footer}>
        <span>CV Autopilot</span>
        <span>{Math.floor(frame / fps)}s</span>
      </div>
    </AbsoluteFill>
  );
}

function TransitionShell({
  children,
  immediateIn = false,
  fadeOut = true,
}: {
  children: React.ReactNode;
  immediateIn?: boolean;
  fadeOut?: boolean;
}) {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [immediateIn ? 0 : TRANSITION_HALF, TRANSITION_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOutValue = fadeOut ? interpolate(
    frame,
    [SCENE_FRAMES - TRANSITION_FRAMES, SCENE_FRAMES - TRANSITION_HALF],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  ) : 1;
  const opacity = Math.min(fadeIn, fadeOutValue);
  const y = interpolate(frame, [0, TRANSITION_FRAMES, SCENE_FRAMES - TRANSITION_FRAMES, SCENE_FRAMES - TRANSITION_HALF], [26, 0, 0, -18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(opacity, [0, 1], [0.985, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

function Intro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });

  return (
    <AbsoluteFill style={styles.scene}>
      <div
        style={{
          ...styles.heroBlock,
          transform: `translateY(${interpolate(enter, [0, 1], [46, 0])}px)`,
        }}
      >
        <div style={styles.kicker}>Building in public</div>
        <h1 style={styles.heroTitle}>I built a job intelligence system</h1>
        <p style={styles.heroText}>
          A backend-first workflow that turns messy job boards into companies, roles, filters, and tailored application materials.
        </p>
      </div>
      <div style={styles.statsGrid}>
        {stats.map((item, index) => (
          <MetricCard key={item.label} {...item} delay={index * 8} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

function ScreenshotScene({
  image,
  kicker,
  title,
  body,
  chips,
}: {
  image: string;
  kicker: string;
  title: string;
  body: string;
  chips: string[];
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 22, stiffness: 80 } });

  return (
    <AbsoluteFill style={styles.scene}>
      <div
        style={{
          ...styles.browserFrame,
          transform: `translateY(${interpolate(progress, [0, 1], [42, 0])}px) scale(${interpolate(progress, [0, 1], [0.96, 1])})`,
        }}
      >
        <div style={styles.browserTop}>
          <span style={styles.dotRed} />
          <span style={styles.dotYellow} />
          <span style={styles.dotGreen} />
          <span style={styles.urlBar}>localhost:3000</span>
        </div>
        {image.startsWith("mock-") ? (
          <MockProductScreen kind={image.replace("mock-", "") as "companies" | "jobs" | "applications"} />
        ) : null}
      </div>
      <div style={styles.captionPanel}>
        <div style={styles.kicker}>{kicker}</div>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <p style={styles.sectionBody}>{body}</p>
        <div style={styles.chips}>
          {chips.map((chip) => (
            <span key={chip} style={styles.chip}>{chip}</span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function FilterScene() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={styles.scene}>
      <div style={styles.pipelinePanel}>
        <div style={styles.kicker}>Filtering</div>
        <h2 style={styles.sectionTitle}>Use AI as the second pass, not the first bill</h2>
        <p style={styles.sectionBody}>
          Cheap deterministic filters narrow the database first. AI is reserved for the candidates already worth deeper judgment.
        </p>
        <div style={styles.pipeline}>
          {flow.map((step, index) => {
            const visible = interpolate(frame, [index * 12, index * 12 + 18], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={step}
                style={{
                  ...styles.pipelineStep,
                  opacity: visible,
                  transform: `translateX(${interpolate(visible, [0, 1], [-30, 0])}px)`,
                }}
              >
                <span style={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
      <CodeBlock />
    </AbsoluteFill>
  );
}

function CodeBlock() {
  const lines = [
    "const candidates = normalFilter(allJobs);",
    "const accepted = candidates.filter(ok);",
    "",
    "if (userRequestsAI) {",
    "  await smartFilter(accepted);",
    "}",
    "",
    "await createApplicationPack(job);",
    "await trackDecision(job);",
  ];

  return (
    <div style={styles.codeBlock}>
      {lines.map((line, index) => (
        <div key={`${line}-${index}`} style={{ ...styles.codeLine, opacity: line ? 1 : 0.4 }}>
          <span style={styles.lineNumber}>{String(index + 1).padStart(2, "0")}</span>
          <span>{line || " "}</span>
        </div>
      ))}
    </div>
  );
}

function MockProductScreen({ kind }: { kind: "companies" | "jobs" | "applications" }) {
  return (
    <div style={styles.mockApp}>
      <div style={styles.mockSidebar}>
        <div style={styles.mockLogo}>CV Autopilot</div>
        {["Dashboard", "Jobs", "Companies", "Applications"].map((item) => (
          <div
            key={item}
            style={{
              ...styles.mockNav,
              ...(item.toLowerCase() === kind || (kind === "jobs" && item === "Jobs") ? styles.mockNavActive : {}),
            }}
          >
            {item}
          </div>
        ))}
      </div>
      <div style={styles.mockMain}>
        {kind === "companies" && <MockCompanies />}
        {kind === "jobs" && <MockJobs />}
        {kind === "applications" && <MockApplications />}
      </div>
    </div>
  );
}

function MockCompanies() {
  const rows = [
    ["Remote", "greenhouse", "job-boards.greenhouse.io/remotecom"],
    ["Runpod", "greenhouse", "job-boards.greenhouse.io/runpod"],
    ["Supabase", "lever", "jobs.lever.co/supabase"],
    ["Pennylane", "ashby", "api.ashbyhq.com/posting-api/job-board/pennylane"],
  ];
  return (
    <>
      <MockHeader title="Companies" action="Discover Companies" />
      <div style={styles.mockSearch}>Search companies...</div>
      <MockTable
        headers={["Name", "ATS", "Endpoint", "Status"]}
        rows={rows.map((row) => [row[0], row[1], row[2], "active"])}
      />
    </>
  );
}

function MockJobs() {
  const rows = [
    ["Runpod", "Junior Frontend Engineer", "Remote EMEA", "accept", "86"],
    ["Supabase", "Software Engineer", "Remote", "accept", "82"],
    ["Pennylane", "Full Stack Engineer", "Paris / Remote", "accept", "78"],
    ["Smartly", "Junior Backend Engineer", "Remote EU", "review", "72"],
    ["Twilio", "Software Engineer I", "Remote", "reject", "44"],
  ];
  return (
    <>
      <MockHeader title="Jobs" action="Filter Candidates" />
      <div style={styles.mockCounters}>
        <span style={styles.mockAccept}>Accepted 561</span>
        <span style={styles.mockReject}>Rejected 57k</span>
        <span>Unfiltered 2,035</span>
      </div>
      <div style={styles.mockFilters}>
        {["Search jobs...", "All companies", "Open", "50 / page"].map((item) => (
          <span key={item} style={styles.mockFiltersSpan}>{item}</span>
        ))}
      </div>
      <MockTable
        headers={["Company", "Title", "Location", "Filter", "Score"]}
        rows={rows}
      />
      <div style={styles.mockPager}>1-50 of 59,718 jobs  |  Page 1 / 1,195</div>
    </>
  );
}

function MockApplications() {
  const rows = [
    ["Runpod", "Junior Frontend Engineer", "CV + Cover letter", "running"],
    ["Supabase", "Software Engineer", "CV ready", "ready"],
    ["Pennylane", "Full Stack Engineer", "Recommendation", "ready"],
    ["Lemonade", "Frontend Engineer", "Application pack", "applied"],
  ];
  return (
    <>
      <MockHeader title="Applications" action="Create CV" />
      <div style={styles.mockDocGrid}>
        {[
          ["23", "docs generated"],
          ["41", "applications tracked"],
          ["3", "document types"],
        ].map(([value, label]) => (
          <div key={label} style={styles.mockDocCard}>
            <strong style={{ display: "block", fontSize: 20, marginBottom: 4 }}>{value}</strong>
            <span style={{ color: "#94a5bc", fontWeight: 800 }}>{label}</span>
          </div>
        ))}
      </div>
      <MockTable
        headers={["Company", "Role", "Documents", "Status"]}
        rows={rows}
      />
    </>
  );
}

function MockHeader({ title, action }: { title: string; action: string }) {
  return (
    <div style={styles.mockHeader}>
      <h3 style={styles.mockTitle}>{title}</h3>
      <button style={styles.mockButton}>{action}</button>
    </div>
  );
}

function MockTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const gridTemplateColumns = headers.length === 5
    ? "1fr 1.7fr 1.2fr 0.8fr 0.6fr"
    : "1fr 1.25fr 2.25fr 0.8fr";
  return (
    <div style={styles.mockTable}>
      <div style={{ ...styles.mockTableHeader, gridTemplateColumns }}>
        {headers.map((header) => <span key={header}>{header}</span>)}
      </div>
      {rows.map((row) => (
        <div key={row.join("-")} style={{ ...styles.mockRow, gridTemplateColumns }}>
          {row.map((cell, index) => <span key={`${cell}-${index}`}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}

function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 82 } });

  return (
    <AbsoluteFill style={styles.scene}>
      <div
        style={{
          ...styles.outroCard,
          transform: `scale(${interpolate(enter, [0, 1], [0.94, 1])})`,
        }}
      >
        <div style={styles.kicker}>The idea</div>
        <h2 style={styles.outroTitle}>Less scrolling. More signal.</h2>
        <p style={styles.outroText}>
          A focused system for discovering companies, syncing jobs, filtering intelligently, and preparing better applications.
        </p>
        <div style={styles.finalStats}>
          <span>Public ATS APIs</span>
          <span>Company-first database</span>
          <span>Human-controlled AI</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function MetricCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        ...styles.metricCard,
        opacity,
        transform: `translateY(${interpolate(opacity, [0, 1], [28, 0])}px)`,
      }}
    >
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

function GridBackground() {
  return (
    <AbsoluteFill
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "54px 54px",
        opacity: 0.45,
      }}
    />
  );
}

function SoftGlow({ top, left, color }: { top: number; left: number; color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        width: 520,
        height: 520,
        borderRadius: 999,
        background: color,
        filter: "blur(90px)",
      }}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    background: "#070b12",
    color: "#f8fbff",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    overflow: "hidden",
  },
  scene: {
    padding: 70,
  },
  heroBlock: {
    width: 900,
    paddingTop: 110,
  },
  kicker: {
    color: "#7c5cff",
    fontSize: 28,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 22,
  },
  heroTitle: {
    fontSize: 90,
    lineHeight: 1,
    margin: 0,
    maxWidth: 940,
    letterSpacing: 0,
  },
  heroText: {
    color: "#b9c5d8",
    fontSize: 33,
    lineHeight: 1.35,
    marginTop: 34,
    maxWidth: 880,
  },
  statsGrid: {
    position: "absolute",
    left: 70,
    right: 70,
    bottom: 105,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  metricCard: {
    background: "rgba(16, 23, 34, 0.86)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: "28px 30px",
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 48,
    fontWeight: 900,
    marginBottom: 8,
  },
  metricLabel: {
    color: "#9fafc5",
    fontSize: 22,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  browserFrame: {
    position: "absolute",
    top: 105,
    left: 100,
    width: 880,
    height: 560,
    borderRadius: 24,
    background: "#111822",
    border: "1px solid rgba(255,255,255,0.12)",
    overflow: "hidden",
    boxShadow: "0 30px 80px rgba(0,0,0,0.38)",
  },
  browserTop: {
    height: 48,
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "0 18px",
    background: "#151d29",
  },
  dotRed: {
    width: 12,
    height: 12,
    borderRadius: 99,
    background: "#ff5f56",
  },
  dotYellow: {
    width: 12,
    height: 12,
    borderRadius: 99,
    background: "#ffbd2e",
  },
  dotGreen: {
    width: 12,
    height: 12,
    borderRadius: 99,
    background: "#27c93f",
  },
  urlBar: {
    marginLeft: 12,
    padding: "7px 16px",
    borderRadius: 999,
    color: "#8190a7",
    background: "#0c121b",
    fontSize: 16,
    minWidth: 220,
  },
  screenshot: {
    width: "100%",
    height: "calc(100% - 48px)",
    objectFit: "cover",
    objectPosition: "left top",
  },
  captionPanel: {
    position: "absolute",
    top: 725,
    left: 70,
    width: 840,
  },
  sectionTitle: {
    fontSize: 50,
    lineHeight: 1.04,
    margin: 0,
    letterSpacing: 0,
  },
  sectionBody: {
    color: "#b9c5d8",
    fontSize: 24,
    lineHeight: 1.38,
    marginTop: 22,
    maxWidth: 760,
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 26,
  },
  chip: {
    color: "#ddf8ea",
    background: "rgba(43, 212, 135, 0.13)",
    border: "1px solid rgba(43, 212, 135, 0.35)",
    borderRadius: 999,
    padding: "10px 15px",
    fontSize: 19,
    fontWeight: 800,
  },
  pipelinePanel: {
    position: "absolute",
    left: 70,
    top: 130,
    width: 455,
  },
  pipeline: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    marginTop: 34,
  },
  pipelineStep: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    background: "rgba(16, 23, 34, 0.86)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 15,
    padding: "18px 20px",
    fontSize: 22,
    fontWeight: 800,
  },
  stepNumber: {
    color: "#2bd487",
    fontVariantNumeric: "tabular-nums",
  },
  codeBlock: {
    position: "absolute",
    right: 70,
    top: 230,
    width: 460,
    background: "#0d131d",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 22,
    padding: "26px 0",
    boxShadow: "0 28px 80px rgba(0,0,0,0.38)",
  },
  codeLine: {
    display: "grid",
    gridTemplateColumns: "48px 1fr",
    gap: 8,
    color: "#d6e2f2",
    fontFamily: "JetBrains Mono, SFMono-Regular, Consolas, monospace",
    fontSize: 16,
    lineHeight: 1.75,
    padding: "0 24px",
    whiteSpace: "pre",
  },
  lineNumber: {
    color: "#526176",
    textAlign: "right",
  },
  outroCard: {
    position: "absolute",
    left: 70,
    right: 70,
    top: 240,
    padding: 58,
    borderRadius: 28,
    background: "linear-gradient(135deg, rgba(124,92,255,0.24), rgba(43,212,135,0.12)), rgba(12,18,27,0.92)",
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "0 30px 100px rgba(0,0,0,0.45)",
  },
  outroTitle: {
    fontSize: 76,
    lineHeight: 1.02,
    margin: 0,
    letterSpacing: 0,
  },
  outroText: {
    color: "#d3deee",
    fontSize: 31,
    lineHeight: 1.35,
    marginTop: 28,
    maxWidth: 830,
  },
  finalStats: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 38,
  },
  mockApp: {
    display: "grid",
    gridTemplateColumns: "125px 1fr",
    height: "calc(100% - 48px)",
    background: "#090e15",
  },
  mockSidebar: {
    background: "#151b24",
    borderRight: "1px solid #252e3a",
    padding: "18px 12px",
  },
  mockLogo: {
    color: "#7c5cff",
    fontSize: 13,
    fontWeight: 900,
    marginBottom: 22,
  },
  mockNav: {
    color: "#9fafc5",
    fontSize: 12,
    fontWeight: 700,
    padding: "9px 10px",
    borderRadius: 8,
    marginBottom: 6,
  },
  mockNavActive: {
    color: "#ffffff",
    background: "rgba(124, 92, 255, 0.35)",
  },
  mockMain: {
    padding: 20,
    overflow: "hidden",
  },
  mockHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  mockTitle: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 1,
    margin: 0,
  },
  mockButton: {
    background: "#7c5cff",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "8px 11px",
    fontSize: 11,
    fontWeight: 900,
  },
  mockSearch: {
    background: "#202733",
    border: "1px solid #343d4a",
    color: "#8796ad",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 12,
    marginBottom: 16,
  },
  mockCounters: {
    display: "flex",
    gap: 8,
    color: "#8fa0b8",
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 12,
  },
  mockAccept: {
    color: "#2bd487",
    background: "rgba(43,212,135,0.13)",
    borderRadius: 999,
    padding: "4px 8px",
  },
  mockReject: {
    color: "#ff6b6b",
    background: "rgba(255,107,107,0.13)",
    borderRadius: 999,
    padding: "4px 8px",
  },
  mockFilters: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 0.7fr 0.7fr",
    gap: 8,
    marginBottom: 16,
  },
  mockFiltersSpan: {
    background: "#202733",
    border: "1px solid #343d4a",
    color: "#b8c7da",
    borderRadius: 8,
    padding: "9px 10px",
    fontSize: 11,
    fontWeight: 800,
  },
  mockTable: {
    borderTop: "1px solid #29313d",
  },
  mockTableHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 1.7fr 1.2fr 0.8fr 0.6fr",
    color: "#8da0ba",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    padding: "12px 0",
  },
  mockRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1.7fr 1.2fr 0.8fr 0.6fr",
    color: "#d9e5f5",
    borderTop: "1px solid #222a35",
    fontSize: 11,
    fontWeight: 700,
    padding: "13px 0",
  },
  mockPager: {
    color: "#8da0ba",
    fontSize: 11,
    fontWeight: 800,
    marginTop: 14,
    textAlign: "right",
  },
  mockDocGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
    marginBottom: 16,
  },
  mockDocCard: {
    background: "#141b25",
    border: "1px solid #273140",
    borderRadius: 10,
    padding: "13px 14px",
    color: "#dfe9f7",
    fontSize: 12,
  },
  footer: {
    position: "absolute",
    left: 70,
    right: 70,
    bottom: 42,
    display: "flex",
    justifyContent: "space-between",
    color: "#637087",
    fontSize: 20,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
};
