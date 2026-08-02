import { ConnectError, Code } from "@connectrpc/connect";

/**
 * Maps a ConnectError or unknown error to a clean, user-friendly Vietnamese error string.
 * Strips raw ConnectRPC error code brackets like "[permission_denied] ...".
 */
export function mapConnectError(
  error: unknown,
  fallbackMessage = "Đã có lỗi xảy ra. Vui lòng thử lại.",
): string {
  if (!error) return fallbackMessage;

  if (error instanceof ConnectError) {
    let rawMsg = error.rawMessage || error.message || "";
    // Clean up rawConnectError brackets like "[permission_denied] message"
    rawMsg = rawMsg.replace(/^\[[a-z_]+\]\s*/i, "").trim();

    if (rawMsg) {
      return rawMsg;
    }

    switch (error.code) {
      case Code.Unauthenticated:
        return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      case Code.PermissionDenied:
        return "Bạn không có quyền thực hiện thao tác này.";
      case Code.NotFound:
        return "Không tìm thấy dữ liệu yêu cầu.";
      case Code.AlreadyExists:
        return "Dữ liệu đã tồn tại trong hệ thống.";
      case Code.InvalidArgument:
        return "Thông tin cung cấp không hợp lệ. Vui lòng kiểm tra lại.";
      case Code.ResourceExhausted:
        return "Đã vượt quá giới hạn cho phép. Vui lòng thử lại sau.";
      case Code.Unimplemented:
        return "Tính năng này đang được phát triển.";
      case Code.Unavailable:
        return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.";
      default:
        return fallbackMessage;
    }
  }

  if (error instanceof Error) {
    return error.message.replace(/^\[[a-z_]+\]\s*/i, "").trim() || fallbackMessage;
  }

  return fallbackMessage;
}
