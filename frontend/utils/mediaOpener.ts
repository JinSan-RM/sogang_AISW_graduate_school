export type OpenMediaUrlOptions = {
  platform: string;
  assignWebLocation: (url: string) => void;
  openExternalUrl: (url: string) => Promise<unknown>;
};

export async function openMediaUrl(url: string, options: OpenMediaUrlOptions): Promise<void> {
  if (options.platform === "web") {
    options.assignWebLocation(url);
    return;
  }

  await options.openExternalUrl(url);
}
