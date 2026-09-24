import {CommitMessageConfig} from '@angular/ng-dev';

/**
 * The configuration for `ng-dev commit-message` commands.
 * Upstream src/* package scopes retired 2026-09-23; library work lives under
 * projects/ngx-material-legacy (use scope "multiple" or docs).
 */
export const commitMessage: CommitMessageConfig = {
  maxLineLength: Infinity,
  minBodyLength: 0,
  minBodyLengthTypeExcludes: ['docs'],
  scopes: [
    'multiple', // For when a commit applies to multiple components.
  ],
};
