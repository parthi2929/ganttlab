/**
 * A group, which can contain projects, tasks, milestones...
 */
export class Group {
  /**
   * @param name - The group name
   * @param path - The group path
   * @param url - The URL to this group (directly usable in an `<a>` href)
   * @param shortDescription - A human friendly, but short description like `The best group ever`
   * @param avatarUrl - The URL to this group avatar (directly usable in an img src)
   */
  constructor(
    public name: string,
    public path: string,
    public url: string,
    public shortDescription: string,
    public avatarUrl: string,
  ) {}
}
