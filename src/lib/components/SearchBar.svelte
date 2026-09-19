<script lang="ts">
	import type { Messages } from '$lib/i18n/messages/types';
	import { translate } from '$lib/i18n';

	interface Props {
		value: string;
		onSubmit: (value: string) => void;
		messages: Messages;
		loading: boolean;
	}

	let { value = $bindable(), onSubmit, messages, loading }: Props = $props();

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		onSubmit(value);
	}
</script>

<form class="search-bar" onsubmit={handleSubmit}>
	<label for="curia-input">{translate(messages, 'search.label')}</label>
	<div class="row">
		<input
			id="curia-input"
			type="text"
			bind:value
			placeholder={translate(messages, 'search.placeholder')}
			autocomplete="off"
			inputmode="text"
		/>
		<button type="submit" disabled={loading}>{translate(messages, 'search.button')}</button>
	</div>
	<p class="help">{translate(messages, 'search.help')}</p>
</form>

<style>
	.search-bar {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	label {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.row {
		display: flex;
		gap: var(--space-2);
	}
	input {
		flex: 1;
		min-width: 0;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 1rem;
	}
	button {
		padding: var(--space-2) var(--space-4);
		border: none;
		border-radius: var(--radius-sm);
		background: var(--color-accent);
		color: white;
		font-weight: 600;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.help {
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
</style>
