declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface CodeClient {
        requestCode(): void;
      }
      interface CodeClientConfig {
        client_id: string;
        scope: string;
        ux_mode: "popup" | "redirect";
        nonce?: string;
        callback: (response: CodeResponse) => void;
        login_hint?: string;
      }
      interface CodeResponse {
        code: string;
        scope: string;
        error?: string;
        error_description?: string;
      }
      function initCodeClient(config: CodeClientConfig): CodeClient;
    }
    namespace id {
      interface CredentialResponse {
        credential: string;
        select_by?: string;
      }
      interface IdConfiguration {
        client_id: string;
        callback: (response: CredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }
      interface PromptNotification {
        isNotDisplayed(): boolean;
        isSkippedMoment(): boolean;
        isDismissedMoment(): boolean;
        getNotDisplayedReason(): string;
        getSkippedReason(): string;
        getDismissedReason(): string;
      }
      interface GsiButtonConfiguration {
        type?: "standard" | "icon";
        theme?: "outline" | "filled_blue" | "filled_black";
        size?: "small" | "medium" | "large";
        text?: "signin_with" | "signup_with" | "continue_with" | "signin";
        shape?: "rectangular" | "pill" | "circle" | "square";
        logo_alignment?: "left" | "center";
        width?: string | number;
        locale?: string;
      }
      function initialize(config: IdConfiguration): void;
      function prompt(momentListener?: (notification: PromptNotification) => void): void;
      function renderButton(parent: HTMLElement, options: GsiButtonConfiguration): void;
      function cancel(): void;
    }
  }
}
