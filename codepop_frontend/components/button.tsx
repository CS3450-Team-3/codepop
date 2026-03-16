// example of how to set up a reusable component. You can import this to any page and use props to customize these.

'use client';

export default function Button({text = "Button"}) {
    return (
        <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
        >
            {text}
        </button>
    );
}