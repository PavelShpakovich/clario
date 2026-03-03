/**
 * Themes API client — pure fetch wrapper (no React)
 * Centralizes all theme API calls
 */

interface Theme {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  is_public?: boolean;
  created_at: string;
}

class ThemesApi {
  /**
   * Fetch all themes (user's + public)
   */
  async listThemes(): Promise<Theme[]> {
    const res = await fetch('/api/themes', {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to load themes');
    }

    const result = (await res.json()) as { themes: Theme[] };
    return result.themes;
  }

  /**
   * Get a specific theme
   */
  async getTheme(themeId: string): Promise<Theme> {
    const res = await fetch(`/api/themes/${themeId}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to load theme');
    }

    const result = (await res.json()) as { theme: Theme };
    return result.theme;
  }

  /**
   * Update theme privacy and metadata
   */
  async updateTheme(
    themeId: string,
    updates: Partial<Pick<Theme, 'name' | 'description' | 'is_public'>>,
  ): Promise<Theme> {
    const res = await fetch(`/api/themes/${themeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || 'Failed to update theme');
    }

    const result = (await res.json()) as { theme: Theme };
    return result.theme;
  }

  /**
   * Toggle theme privacy status
   */
  async togglePrivacy(themeId: string, isPublic: boolean): Promise<Theme> {
    return this.updateTheme(themeId, { is_public: isPublic });
  }
}

export const themesApi = new ThemesApi();
