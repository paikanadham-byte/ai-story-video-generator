function ProgressScreen({ progress, currentStep, detail, completedSteps, steps, stepLabels }) {
  return (
    <div className="page-container">
      <div className="page-header" style={{ textAlign: "center" }}>
        <h2>Generating Your Video</h2>
        <p>Sit back — this may take a few minutes</p>
      </div>

      <div className="card progress-card glow">
      <div className="spinner" />

      <div className="progress-percent">{progress}%</div>

      <div className="progress-step">{stepLabels[currentStep] || currentStep}</div>
      <div className="progress-detail">{detail}</div>

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="steps-indicator">
        {steps.map((step) => {
          const isDone = completedSteps.includes(step);
          const isActive = step === currentStep;
          return (
            <span
              key={step}
              className={`step-pill ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
            >
              {isDone ? "✓ " : ""}{stepLabels[step]}
            </span>
          );
        })}
      </div>
    </div>
    </div>
  );
}

export default ProgressScreen;
