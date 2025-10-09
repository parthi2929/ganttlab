export class GitLabGroup {
  constructor(
    public name: string,
    public full_path: string,
    public web_url: string,
    public description: string,
    public avatar_url: string,
  ) {}
}
