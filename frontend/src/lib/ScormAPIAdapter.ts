/**
 * SCORM API Adapter matching standard SCORM 1.2 and 2004 runtime bindings.
 * This class exposes objects matching the signatures required by SCORM content packages
 * and maps them back to ConnectRPC save operations and completion hooks.
 */
export class ScormAPIAdapter {
  private cmiData: Record<string, string>;
  private onSave: (data: Record<string, string>) => Promise<void>;
  private onComplete: () => void;

  constructor(
    initialData: Record<string, string>,
    onSave: (data: Record<string, string>) => Promise<void>,
    onComplete: () => void
  ) {
    this.cmiData = { ...initialData };
    this.onSave = onSave;
    this.onComplete = onComplete;
  }

  /**
   * Return SCORM 1.2 compatible API interface.
   * Standard SCORM 1.2 looks for window.API.
   */
  public getAPI12() {
    return {
      LMSInitialize: (param: string): string => {
        console.log("SCORM 1.2 API: LMSInitialize called with", param);
        return "true";
      },
      LMSFinish: (param: string): string => {
        console.log("SCORM 1.2 API: LMSFinish called with", param);
        this.onSave(this.cmiData);
        return "true";
      },
      LMSGetValue: (element: string): string => {
        const val = this.cmiData[element] || "";
        console.log(`SCORM 1.2 API: LMSGetValue(${element}) -> "${val}"`);
        return val;
      },
      LMSSetValue: (element: string, value: string): string => {
        console.log(`SCORM 1.2 API: LMSSetValue(${element}, "${value}")`);
        this.cmiData[element] = value;

        // Automatically trigger completion check
        if (
          element === "cmi.core.lesson_status" &&
          (value === "completed" || value === "passed")
        ) {
          this.onComplete();
        }
        return "true";
      },
      LMSCommit: (param: string): string => {
        console.log("SCORM 1.2 API: LMSCommit called with", param);
        this.onSave(this.cmiData);
        return "true";
      },
      LMSGetLastError: (): string => "0",
      LMSGetErrorString: (_errorCode: string): string => "No error",
      LMSGetDiagnostic: (_errorCode: string): string => "Diagnostic info",
    };
  }

  /**
   * Return SCORM 2004 compatible API interface.
   * Standard SCORM 2004 looks for window.API_1484_11.
   */
  public getAPI2004() {
    return {
      Initialize: (param: string): string => {
        console.log("SCORM 2004 API: Initialize called with", param);
        return "true";
      },
      Terminate: (param: string): string => {
        console.log("SCORM 2004 API: Terminate called with", param);
        this.onSave(this.cmiData);
        return "true";
      },
      GetValue: (element: string): string => {
        const val = this.cmiData[element] || "";
        console.log(`SCORM 2004 API: GetValue(${element}) -> "${val}"`);
        return val;
      },
      SetValue: (element: string, value: string): string => {
        console.log(`SCORM 2004 API: SetValue(${element}, "${value}")`);
        this.cmiData[element] = value;

        // Automatically trigger completion checks
        if (
          (element === "cmi.completion_status" && value === "completed") ||
          (element === "cmi.success_status" && value === "passed")
        ) {
          this.onComplete();
        }
        return "true";
      },
      Commit: (param: string): string => {
        console.log("SCORM 2004 API: Commit called with", param);
        this.onSave(this.cmiData);
        return "true";
      },
      GetLastError: (): string => "0",
      GetErrorString: (_errorCode: string): string => "No error",
      GetDiagnostic: (_errorCode: string): string => "Diagnostic info",
    };
  }
}
