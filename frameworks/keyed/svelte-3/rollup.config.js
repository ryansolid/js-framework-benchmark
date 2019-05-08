import svelte from 'rollup-plugin-svelte';
import nodeResolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

// if (process.env.production) {
//     plugins.push(terser({
//         parse: {
//             ecma: 8,
//         },
//         compress: {
//             ecma: 5,
//             inline: true,
//             reduce_funcs: false,
//             passes: 5,
//         },
//         output: {
//             ecma: 5,
//             comments: false,
//         },
//         toplevel: true,
//         module: true,
//     }));
// }

export default {
    input: 'src/main.es6.js',
    output: {
        file: 'dist/main.js',
        format: 'es'
    },
    plugins: [
        svelte({
            dev: !production,
        }),
        nodeResolve(),
        production && terser()
    ]
};
