export default function WorkspaceActions() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
        Workspace Actions
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This is a placeholder for managing your workspaces.
      </p>

      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
        <li>View existing workspaces</li>
        <li>Switch between workspaces</li>
        <li>Create new workspace</li>
        <li>Rename or delete workspaces</li>
      </ul>

      <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">
        + New Workspace
      </button>
    </div>
  );
}
