from pathlib import Path

path = Path('app/api/_lib/slackLeadList.ts')
text = path.read_text(encoding='utf-8')

text = text.replace(
"""  let createFailures = 0
  let updateFailures = 0
""",
"""  let createFailures = 0
  let updateFailures = 0
  const createErrors: string[] = []
  const updateErrors: string[] = []
""",
1,
)

text = text.replace(
"""      } catch {
        createFailures += 1
      }
""",
"""      } catch (error) {
        createFailures += 1
        if (createErrors.length < 5) {
          createErrors.push(error instanceof Error ? error.message : 'slack_list_create_failed')
        }
      }
""",
1,
)

text = text.replace(
"""    } catch {
      updateFailures += 1
    }
""",
"""    } catch (error) {
      updateFailures += 1
      if (updateErrors.length < 5) {
        updateErrors.push(error instanceof Error ? error.message : 'slack_list_update_failed')
      }
    }
""",
1,
)

text = text.replace(
"""    createFailures,
    updateFailures,
  }
}
""",
"""    createFailures,
    updateFailures,
    createErrors,
    updateErrors,
  }
}
""",
1,
)

path.write_text(text, encoding='utf-8')
