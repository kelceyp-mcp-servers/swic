[# Object Types

## High-Level Types

These are the domain objects that users interact with directly:

- **cartridges** - Knowledge modules and documentation
- **stories** - High-level work items or features
- **subtasks** - Implementation units within stories
- **pipelines** - Reusable process definitions
- **runs** - Instances of pipeline execution
- **templates** - Reusable document structures

## Low-Level Types

These are the underlying storage primitives:

- **document** - A single file containing content
- **folder** - A directory containing documents or other folders

## Versioning

All objects in the system are versioned. Each modification creates a new version, allowing for history tracking and rollback capabilities.

## Scopes

Objects exist within one of two scopes:

- **project** - Project-specific objects, local to the current repository
- **shared** - User-level objects, shared across projects

## Unique Identifiers

Within a scope, each object has a unique ID with a type-specific prefix:

- **cartridges**: `crt{num}` (e.g., `crt001`, `crt002`)
- **stories**: `sto{num}` (e.g., `sto001`, `sto002`)
- **subtasks**: `sub{num}` (e.g., `sub001`, `sub002`)
- **pipelines**: `ppl{num}` (e.g., `ppl001`, `ppl002`)
- **runs**: `run{num}` (e.g., `run001`, `run002`)
- **templates**: `tpl{num}` (e.g., `tpl001`, `tpl002`)

## Addressing Methods

Objects can be addressed using two methods:

### Method 1: Path-based addressing
```
scope + type + path + name + [version]
```
Example: `project/cartridge/auth/jwt-setup` or `shared/template/story/default`

### Method 2: ID-based addressing
```
scope + unique_id + [version]
```
Example: `project/crt001` or `shared/ppl003`

### Version Specification

- Not passing a version addresses the latest version
- Version can only be specified with read operations
- Write operations always create a new version

## Implementation Notes

High-level types are visible to users through their logical names and operations. Users interact with these using domain-specific commands and don't typically need to know about the underlying file structure.

Low-level types (documents and folders) are mostly hidden from users as implementation details. The exceptions are:
- **cartridges** - Users may interact with these as documents with paths
- **templates** - Users may work with these as files

For stories, subtasks, pipelines, and runs, the underlying file/folder structure is managed by the system and users cannot directly modify it.

All objects are ultimately stored as files and folders in a git repository, but this is transparent to most user operations.]()